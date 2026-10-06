package com.salazar.api.auth;

import com.salazar.api.common.exception.InvalidResetTokenException;
import com.salazar.api.common.mail.MailService;
import com.salazar.api.common.security.TokenHasher;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@EnableConfigurationProperties(PasswordResetProperties.class)
@RequiredArgsConstructor
public class PasswordResetService {
    private static final String INVALID_TOKEN_MESSAGE = "Este enlace no es válido o ya venció.";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetRequestLimiter limiter;
    private final LoginAttemptService loginAttemptService;
    private final PasswordResetProperties properties;
    private final PasswordEncoder passwordEncoder;
    private final TokenHasher tokenHasher;
    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Transactional
    public void requestReset(String email) {
        limiter.checkAndRecord(email);

        User user = userRepository.findByEmail(email).filter(User::isActive).orElse(null);
        if (user == null) {
            return;
        }

        tokenRepository.invalidateActiveByUserId(user.getId());

        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        tokenRepository.save(new PasswordResetToken(
                user.getId(), tokenHasher.hash(rawToken), Instant.now().plus(properties.tokenTtl())));

        String link = frontendUrl + "/restablecer-contrasena?token=" + rawToken;
        sendAfterCommit(user, link);
    }

    @Transactional(readOnly = true)
    public void validate(String rawToken) {
        tokenRepository
                .findByTokenHash(tokenHasher.hash(rawToken))
                .filter(PasswordResetToken::isUsable)
                .orElseThrow(this::invalidToken);
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        PasswordResetToken token = tokenRepository
                .findByTokenHashForUpdate(tokenHasher.hash(rawToken))
                .filter(PasswordResetToken::isUsable)
                .orElseThrow(this::invalidToken);
        User user = userRepository.findById(token.getUserId()).filter(User::isActive).orElseThrow(this::invalidToken);

        user.changePassword(passwordEncoder.encode(newPassword));
        token.markUsed();
        refreshTokenRepository.revokeAllByUserId(user.getId());
        loginAttemptService.recordSuccess(user.getEmail());
    }

    private InvalidResetTokenException invalidToken() {
        return new InvalidResetTokenException(INVALID_TOKEN_MESSAGE);
    }

    // The link must not leave before the token is committed, or a fast click would find nothing
    private void sendAfterCommit(User user, String link) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                mailService.sendPasswordResetEmail(user.getEmail(), user.getFirstName(), link);
            }
        });
    }
}
