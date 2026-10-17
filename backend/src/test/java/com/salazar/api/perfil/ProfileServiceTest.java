package com.salazar.api.perfil;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.RefreshTokenRepository;
import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.auth.dto.UserResponse;
import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.common.exception.TooManyAttemptsException;
import com.salazar.api.common.security.TokenHasher;
import com.salazar.api.perfil.dto.ChangePasswordRequest;
import com.salazar.api.perfil.dto.UpdateProfileRequest;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {
    private static final long USER_ID = 7L;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PasswordChangeAttemptService attemptService;

    private final TokenHasher tokenHasher = new TokenHasher();

    private ProfileService service() {
        return new ProfileService(userRepository, refreshTokenRepository, passwordEncoder, attemptService, tokenHasher);
    }

    private User customer(String hash) {
        User user = new User("maria@correo.com", hash, "María", "Quispe", "987654321", UserRole.CLIENTE);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        return user;
    }

    @Test
    void updatesTheBasicData() {
        User user = customer("hash");

        UserResponse response =
                service().updateProfile(USER_ID, new UpdateProfileRequest("Ana", "Torres", "912345678"));

        assertThat(user.getFirstName()).isEqualTo("Ana");
        assertThat(user.getLastName()).isEqualTo("Torres");
        assertThat(user.getPhone()).isEqualTo("912345678");
        assertThat(response.firstName()).isEqualTo("Ana");
    }

    @Test
    void requestTrimsTheBasicData() {
        UpdateProfileRequest request = new UpdateProfileRequest("  Ana ", " Torres", "912345678 ");

        assertThat(request.firstName()).isEqualTo("Ana");
        assertThat(request.lastName()).isEqualTo("Torres");
        assertThat(request.phone()).isEqualTo("912345678");
    }

    @Test
    void anAdministratorCanUpdateTheirOwnProfile() {
        User admin = User.administrator("admin@correo.com", "hash", "Admin", "Salazar", null);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(admin));

        service().updateProfile(USER_ID, new UpdateProfileRequest("Rosa", "Salazar", "912345678"));

        assertThat(admin.getFirstName()).isEqualTo("Rosa");
        assertThat(admin.getPhone()).isEqualTo("912345678");
    }

    @Test
    void anAdministratorCanChangeTheirPassword() {
        User admin = User.administrator("admin@correo.com", "hash", "Admin", "Salazar", null);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("clave1234", "hash")).thenReturn(true);
        when(passwordEncoder.matches("nueva5678", "hash")).thenReturn(false);
        when(passwordEncoder.encode("nueva5678")).thenReturn("new-hash");

        service().changePassword(USER_ID, new ChangePasswordRequest("clave1234", "nueva5678"), "raw-refresh");

        assertThat(admin.getPasswordHash()).isEqualTo("new-hash");
        verify(refreshTokenRepository).revokeAllByUserIdExcept(USER_ID, tokenHasher.hash("raw-refresh"));
    }

    @Test
    void anInactiveAccountIsRejected() {
        User inactive = customer("hash");
        ReflectionTestUtils.setField(inactive, "active", false);

        assertThatThrownBy(() -> service().updateProfile(USER_ID, new UpdateProfileRequest("A", "B", "912345678")))
                .isInstanceOf(InsufficientAuthenticationException.class);
    }

    @Test
    void wrongCurrentPasswordFailsAndCountsAsAnAttempt() {
        customer("hash");
        when(passwordEncoder.matches("mala1234", "hash")).thenReturn(false);

        assertThatThrownBy(() ->
                        service().changePassword(USER_ID, new ChangePasswordRequest("mala1234", "nueva5678"), "rt"))
                .isInstanceOf(FieldInvalidException.class)
                .hasMessage("La contraseña actual no es correcta.");

        verify(attemptService).recordFailure(USER_ID);
        verify(refreshTokenRepository, never()).revokeAllByUserIdExcept(anyLong(), anyString());
    }

    @Test
    void blockedUserIsRejectedBeforeCheckingThePassword() {
        customer("hash");
        org.mockito.Mockito.doThrow(new TooManyAttemptsException("x")).when(attemptService).checkNotBlocked(USER_ID);

        assertThatThrownBy(() ->
                        service().changePassword(USER_ID, new ChangePasswordRequest("clave1234", "nueva5678"), "rt"))
                .isInstanceOf(TooManyAttemptsException.class);

        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void missingCurrentPasswordFails() {
        customer("hash");

        assertThatThrownBy(() -> service().changePassword(USER_ID, new ChangePasswordRequest(null, "nueva5678"), "rt"))
                .isInstanceOf(FieldInvalidException.class)
                .extracting("field")
                .isEqualTo("currentPassword");
    }

    @Test
    void newPasswordEqualToTheCurrentFails() {
        customer("hash");
        when(passwordEncoder.matches("clave1234", "hash")).thenReturn(true);

        assertThatThrownBy(() ->
                        service().changePassword(USER_ID, new ChangePasswordRequest("clave1234", "clave1234"), "rt"))
                .isInstanceOf(FieldInvalidException.class)
                .extracting("field")
                .isEqualTo("newPassword");
    }

    @Test
    void changesThePasswordAndRevokesTheOtherSessions() {
        User user = customer("hash");
        when(passwordEncoder.matches("clave1234", "hash")).thenReturn(true);
        when(passwordEncoder.matches("nueva5678", "hash")).thenReturn(false);
        when(passwordEncoder.encode("nueva5678")).thenReturn("new-hash");

        service().changePassword(USER_ID, new ChangePasswordRequest("clave1234", "nueva5678"), "raw-refresh");

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        verify(attemptService).recordSuccess(USER_ID);
        verify(refreshTokenRepository).revokeAllByUserIdExcept(USER_ID, tokenHasher.hash("raw-refresh"));
    }

    @Test
    void withoutARefreshCookieAllSessionsAreRevoked() {
        customer("hash");
        when(passwordEncoder.matches("clave1234", "hash")).thenReturn(true);
        when(passwordEncoder.matches("nueva5678", "hash")).thenReturn(false);

        service().changePassword(USER_ID, new ChangePasswordRequest("clave1234", "nueva5678"), null);

        verify(refreshTokenRepository).revokeAllByUserId(USER_ID);
    }

    @Test
    void aGoogleAccountCreatesItsPasswordWithoutTheCurrentOne() {
        User google = User.fromGoogle("ana@correo.com", "g-1", "Ana", "Torres");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(google));
        when(passwordEncoder.encode("nueva5678")).thenReturn("new-hash");

        service().changePassword(USER_ID, new ChangePasswordRequest(null, "nueva5678"), "rt");

        assertThat(google.getPasswordHash()).isEqualTo("new-hash");
        verify(attemptService, never()).checkNotBlocked(USER_ID);
    }
}
