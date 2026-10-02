package com.salazar.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.dto.RegisterRequest;
import com.salazar.api.common.exception.FieldConflictException;
import com.salazar.api.common.security.JwtService;
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

    private AuthService service() {
        return new AuthService(userRepository, refreshTokenRepository, passwordEncoder, jwtService);
    }

    private RegisterRequest request() {
        return new RegisterRequest("maria@correo.com", "clave1234", "María", "Quispe", "987654321");
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

        AuthResult result = authService.register(request(), "JUnit-agent");

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

        assertThatThrownBy(() -> authService.register(request(), "JUnit-agent"))
                .isInstanceOf(FieldConflictException.class)
                .satisfies(ex -> assertThat(((FieldConflictException) ex).getField()).isEqualTo("email"));
    }
}
