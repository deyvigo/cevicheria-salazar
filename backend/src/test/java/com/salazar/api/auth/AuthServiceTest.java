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
import com.salazar.api.common.exception.SessionExpiredException;
import com.salazar.api.common.exception.TooManyAttemptsException;
import com.salazar.api.common.security.JwtService;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
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

    @Test
    void loginWithGoogleCreatesANewAccountWhenNeitherGoogleIdNorEmailExist() {
        AuthService authService = service();
        when(userRepository.findByGoogleId("google-123")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("nueva@correo.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateAccessToken(any(), any(), any())).thenReturn("jwt-token");

        AuthResult result =
                authService.loginWithGoogle("google-123", "nueva@correo.com", "María", "Quispe", "JUnit-agent");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getPasswordHash()).isNull();
        assertThat(savedUser.getPhone()).isNull();
        assertThat(savedUser.isEmailVerified()).isTrue();
        assertThat(savedUser.getRole()).isEqualTo(UserRole.CLIENTE);
        assertThat(result.user().email()).isEqualTo("nueva@correo.com");
    }

    @Test
    void loginWithGoogleReusesTheExistingAccountWhenTheGoogleIdIsAlreadyLinked() {
        AuthService authService = service();
        User existing = User.fromGoogle("maria@correo.com", "google-123", "María", "Quispe");
        when(userRepository.findByGoogleId("google-123")).thenReturn(Optional.of(existing));
        when(jwtService.generateAccessToken(any(), any(), any())).thenReturn("jwt-token");

        authService.loginWithGoogle("google-123", "maria@correo.com", "María", "Quispe", "JUnit-agent");

        verify(userRepository, never()).findByEmail(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void loginWithGoogleLinksAnExistingAccountRegisteredWithHu01ByEmail() {
        AuthService authService = service();
        User existing = activeUserWithHash("hashed-password");
        when(userRepository.findByGoogleId("google-123")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("maria@correo.com")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateAccessToken(any(), any(), any())).thenReturn("jwt-token");

        authService.loginWithGoogle("google-123", "maria@correo.com", "María", "Quispe", "JUnit-agent");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getGoogleId()).isEqualTo("google-123");
        // la cuenta vinculada conserva su contraseña: sigue pudiendo entrar con cualquiera de las dos.
        assertThat(userCaptor.getValue().getPasswordHash()).isEqualTo("hashed-password");
    }

    @Test
    void loginWithGoogleOfAnInactiveAccountThrowsInvalidCredentialsWithoutLinking() {
        AuthService authService = service();
        User inactive = activeUserWithHash("hashed-password");
        inactive.deactivate();
        when(userRepository.findByGoogleId("google-123")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("maria@correo.com")).thenReturn(Optional.of(inactive));

        assertThatThrownBy(() ->
                        authService.loginWithGoogle("google-123", "maria@correo.com", "María", "Quispe", "JUnit-agent"))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(userRepository, never()).save(any());
    }

    private RefreshToken storedToken(Instant expiresAt, boolean revoked) {
        RefreshToken token = new RefreshToken(1L, "hash", "agent", expiresAt);
        if (revoked) {
            token.revoke();
        }
        return token;
    }

    @Test
    void refreshRotatesAValidTokenAndIssuesNewOnes() {
        AuthService authService = service();
        RefreshToken stored = storedToken(Instant.now().plusSeconds(3600), false);
        User user = activeUserWithHash("hashed-password");
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(stored));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(jwtService.generateAccessToken(any(), any(), any())).thenReturn("new-jwt");

        AuthResult result = authService.refresh("raw-token", "JUnit-agent");

        assertThat(stored.getRevokedAt()).isNotNull();
        assertThat(result.accessToken()).isEqualTo("new-jwt");
        assertThat(result.refreshToken()).isNotBlank().isNotEqualTo("raw-token");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void refreshFailsTheSameWayForUnknownRevokedExpiredAndInactive() {
        AuthService authService = service();
        User inactive = activeUserWithHash("hashed-password");
        inactive.deactivate();

        when(refreshTokenRepository.findByTokenHash(any()))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(storedToken(Instant.now().plusSeconds(3600), true)))
                .thenReturn(Optional.of(storedToken(Instant.now().minusSeconds(1), false)))
                .thenReturn(Optional.of(storedToken(Instant.now().plusSeconds(3600), false)));
        when(userRepository.findById(1L)).thenReturn(Optional.of(inactive));

        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> authService.refresh("raw-token", "agent"))
                    .isInstanceOf(SessionExpiredException.class)
                    .hasMessage("Tu sesión expiró. Inicia sesión de nuevo.");
        }
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void getCurrentUserReturnsTheProfileOrFailsAuthentication() {
        AuthService authService = service();
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeUserWithHash("h")));
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        assertThat(authService.getCurrentUser(1L).email()).isEqualTo("maria@correo.com");
        assertThatThrownBy(() -> authService.getCurrentUser(2L))
                .isInstanceOf(InsufficientAuthenticationException.class);
    }
}
