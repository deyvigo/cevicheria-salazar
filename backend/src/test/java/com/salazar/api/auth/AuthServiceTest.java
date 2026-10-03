package com.salazar.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.dto.LoginRequest;
import com.salazar.api.auth.dto.RegisterRequest;
import com.salazar.api.common.exception.FieldConflictException;
import com.salazar.api.common.exception.InvalidCredentialsException;
import com.salazar.api.common.exception.TooManyAttemptsException;
import com.salazar.api.common.security.JwtService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private LoginAttemptService loginAttemptService;

    private AuthService service() {
        return new AuthService(userRepository, refreshTokenRepository, passwordEncoder, jwtService, loginAttemptService);
    }

    private RegisterRequest registerRequest() {
        return new RegisterRequest("maria@correo.com", "clave1234", "María", "Quispe", "987654321");
    }

    private User activeUserWithHash(String hash) {
        return new User("maria@correo.com", hash, "María", "Quispe", "987654321", UserRole.CLIENTE);
    }

    @Test
    void savesTheHashedPasswordAndDefaultsOnSuccess() {
        AuthService authService = service();
        when(passwordEncoder.encode("clave1234")).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            // simula lo que Postgres asignaría al insertar
            return user;
        });
        when(jwtService.generateAccessToken(any(), any(), any())).thenReturn("jwt-token");

        AuthResult result = authService.register(registerRequest(), "JUnit-agent");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getPasswordHash()).isEqualTo("hashed-password");
        assertThat(savedUser.getEmail()).isEqualTo("maria@correo.com");
        assertThat(savedUser.getRole()).isEqualTo(UserRole.CLIENTE);
        assertThat(savedUser.isEmailVerified()).isFalse();
        assertThat(savedUser.isActive()).isTrue();

        assertThat(result.accessToken()).isEqualTo("jwt-token");
        assertThat(result.refreshToken()).isNotBlank();
        assertThat(result.user().email()).isEqualTo("maria@correo.com");

        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void duplicateEmailBecomesAFieldConflictOnTheEmailField() {
        AuthService authService = service();
        when(passwordEncoder.encode(any())).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenThrow(new DataIntegrityViolationException("duplicate key"));

        assertThatThrownBy(() -> authService.register(registerRequest(), "JUnit-agent"))
                .isInstanceOf(FieldConflictException.class)
                .satisfies(ex -> assertThat(((FieldConflictException) ex).getField()).isEqualTo("email"));
    }

    @Test
    void loginWithCorrectCredentialsRecordsSuccessAndReturnsTokens() {
        AuthService authService = service();
        User user = activeUserWithHash("hashed-password");
        when(userRepository.findByEmail("maria@correo.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("clave1234", "hashed-password")).thenReturn(true);
        when(jwtService.generateAccessToken(any(), any(), any())).thenReturn("jwt-token");

        AuthResult result = authService.login(new LoginRequest("maria@correo.com", "clave1234"), "JUnit-agent");

        verify(loginAttemptService).checkNotBlocked("maria@correo.com");
        verify(loginAttemptService).recordSuccess("maria@correo.com");
        verify(loginAttemptService, never()).recordFailure(any());
        assertThat(result.accessToken()).isEqualTo("jwt-token");
        assertThat(result.user().email()).isEqualTo("maria@correo.com");
    }

    @Test
    void loginWithWrongPasswordRecordsFailureAndThrowsInvalidCredentials() {
        AuthService authService = service();
        User user = activeUserWithHash("hashed-password");
        when(userRepository.findByEmail("maria@correo.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("incorrecta", "hashed-password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("maria@correo.com", "incorrecta"), "JUnit-agent"))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(loginAttemptService).recordFailure(eq("maria@correo.com"));
    }

    @Test
    void loginWithNonExistentEmailRecordsFailureAndThrowsTheSameInvalidCredentials() {
        AuthService authService = service();
        when(userRepository.findByEmail("no-existe@correo.com")).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () -> authService.login(new LoginRequest("no-existe@correo.com", "cualquier-cosa"), "JUnit-agent"))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(loginAttemptService).recordFailure(eq("no-existe@correo.com"));
    }

    @Test
    void loginOfAnInactiveAccountRecordsFailureAndThrowsTheSameInvalidCredentials() {
        AuthService authService = service();
        User user = new User("maria@correo.com", "hashed-password", "María", "Quispe", "987654321", UserRole.CLIENTE);
        user.deactivate();
        when(userRepository.findByEmail("maria@correo.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("clave1234", "hashed-password")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new LoginRequest("maria@correo.com", "clave1234"), "JUnit-agent"))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(loginAttemptService).recordFailure(eq("maria@correo.com"));
    }

    @Test
    void loginChecksTheAttemptLimitBeforeTouchingTheDatabase() {
        AuthService authService = service();
        doThrow(new TooManyAttemptsException("bloqueado")).when(loginAttemptService).checkNotBlocked("maria@correo.com");

        assertThatThrownBy(() -> authService.login(new LoginRequest("maria@correo.com", "clave1234"), "JUnit-agent"))
                .isInstanceOf(TooManyAttemptsException.class);

        verify(userRepository, never()).findByEmail(any());
    }
}
