package com.salazar.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.common.exception.InvalidResetTokenException;
import com.salazar.api.common.exception.TooManyAttemptsException;
import com.salazar.api.common.mail.MailService;
import com.salazar.api.common.security.TokenHasher;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {
    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordResetRequestLimiter limiter;

    @Mock
    private LoginAttemptService loginAttemptService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    private final TokenHasher tokenHasher = new TokenHasher();
    private final PasswordResetProperties properties =
            new PasswordResetProperties(Duration.ofMinutes(30), 3, Duration.ofDays(1));

    @BeforeEach
    void initSynchronization() {
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void clearSynchronization() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    private PasswordResetService service() {
        PasswordResetService service = new PasswordResetService(
                userRepository,
                tokenRepository,
                refreshTokenRepository,
                limiter,
                loginAttemptService,
                properties,
                passwordEncoder,
                tokenHasher,
                mailService);
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:5173");
        return service;
    }

    private void commit() {
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
    }

    private User activeUser() {
        User user = new User("maria@correo.com", "old-hash", "María", "Quispe", "987654321", UserRole.CLIENTE);
        ReflectionTestUtils.setField(user, "id", 7L);
        return user;
    }

    @Test
    void requestResetStoresOnlyTheHashAndMailsTheRawTokenAfterCommit() {
        when(userRepository.findByEmail("maria@correo.com")).thenReturn(Optional.of(activeUser()));

        service().requestReset("maria@correo.com");

        verify(limiter).checkAndRecord("maria@correo.com");
        verify(tokenRepository).invalidateActiveByUserId(7L);
        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(saved.capture());
        verify(mailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());

        commit();

        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendPasswordResetEmail(eq("maria@correo.com"), eq("María"), link.capture());
        String rawToken = link.getValue().substring(link.getValue().indexOf("token=") + 6);
        assertThat(link.getValue()).startsWith("http://localhost:5173/restablecer-contrasena?token=");
        assertThat(saved.getValue().getTokenHash()).isEqualTo(tokenHasher.hash(rawToken)).isNotEqualTo(rawToken);
        assertThat(saved.getValue().getExpiresAt())
                .isBetween(Instant.now().plus(Duration.ofMinutes(29)), Instant.now().plus(Duration.ofMinutes(31)));
    }

    @Test
    void requestResetDoesNothingForUnknownEmail() {
        when(userRepository.findByEmail("nadie@correo.com")).thenReturn(Optional.empty());

        service().requestReset("nadie@correo.com");
        commit();

        verify(tokenRepository, never()).save(any());
        verify(mailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
    }

    @Test
    void requestResetDoesNothingForInactiveAccount() {
        User user = activeUser();
        user.deactivate();
        when(userRepository.findByEmail("maria@correo.com")).thenReturn(Optional.of(user));

        service().requestReset("maria@correo.com");
        commit();

        verify(tokenRepository, never()).save(any());
        verify(mailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
    }

    @Test
    void requestResetPropagatesTheRateLimit() {
        doThrow(new TooManyAttemptsException("límite")).when(limiter).checkAndRecord("maria@correo.com");

        assertThatThrownBy(() -> service().requestReset("maria@correo.com"))
                .isInstanceOf(TooManyAttemptsException.class);
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void resetPasswordChangesThePasswordConsumesTheTokenAndRevokesSessions() {
        User user = activeUser();
        PasswordResetToken token = new PasswordResetToken(7L, tokenHasher.hash("raw"), Instant.now().plusSeconds(600));
        when(tokenRepository.findByTokenHashForUpdate(tokenHasher.hash("raw"))).thenReturn(Optional.of(token));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("nueva1234")).thenReturn("new-hash");

        service().resetPassword("raw", "nueva1234");

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        assertThat(token.getUsedAt()).isNotNull();
        verify(refreshTokenRepository).revokeAllByUserId(7L);
        verify(loginAttemptService).recordSuccess("maria@correo.com");
    }

    @Test
    void rejectsAnUnknownToken() {
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        when(tokenRepository.findByTokenHashForUpdate(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().validate("nope")).isInstanceOf(InvalidResetTokenException.class);
        assertThatThrownBy(() -> service().resetPassword("nope", "nueva1234"))
                .isInstanceOf(InvalidResetTokenException.class);
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void rejectsAnExpiredToken() {
        PasswordResetToken expired = new PasswordResetToken(7L, "h", Instant.now().minusSeconds(1));
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service().validate("raw")).isInstanceOf(InvalidResetTokenException.class);
    }

    @Test
    void rejectsAnAlreadyUsedToken() {
        PasswordResetToken used = new PasswordResetToken(7L, "h", Instant.now().plusSeconds(600));
        used.markUsed();
        when(tokenRepository.findByTokenHashForUpdate(anyString())).thenReturn(Optional.of(used));

        assertThatThrownBy(() -> service().resetPassword("raw", "nueva1234"))
                .isInstanceOf(InvalidResetTokenException.class);
        verify(refreshTokenRepository, never()).revokeAllByUserId(any());
    }
}
