package com.salazar.api.auth;

import com.salazar.api.auth.dto.LoginRequest;
import com.salazar.api.auth.dto.RegisterRequest;
import com.salazar.api.auth.dto.UserResponse;
import com.salazar.api.common.exception.FieldConflictException;
import com.salazar.api.common.exception.InvalidCredentialsException;
import com.salazar.api.common.exception.SessionExpiredException;
import com.salazar.api.common.security.JwtService;
import com.salazar.api.common.security.SessionCookieFactory;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int USER_AGENT_MAX_LENGTH = 255;

    private static final String INVALID_CREDENTIALS_MESSAGE = "Correo o contraseña incorrectos.";

    private static final String SESSION_EXPIRED_MESSAGE = "Tu sesión expiró. Inicia sesión de nuevo.";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public AuthResult register(RegisterRequest request, String userAgent) {
        User user = new User(
                request.email(),
                passwordEncoder.encode(request.password()),
                request.firstName(),
                request.lastName(),
                request.phone(),
                UserRole.CLIENTE);

        try {
            user = userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            throw new FieldConflictException("email", "Este correo ya está registrado.");
        }

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = createRefreshToken(user.getId(), userAgent);

        return new AuthResult(UserResponse.from(user), accessToken, refreshToken);
    }

    @Transactional
    public AuthResult login(LoginRequest request, String userAgent) {
        loginAttemptService.checkNotBlocked(request.email());

        User user = userRepository.findByEmail(request.email()).orElse(null);
        boolean validCredentials = user != null
                && user.getPasswordHash() != null
                && passwordEncoder.matches(request.password(), user.getPasswordHash())
                && user.isActive();

        if (!validCredentials) {
            loginAttemptService.recordFailure(request.email());
            throw new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE);
        }

        loginAttemptService.recordSuccess(request.email());

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = createRefreshToken(user.getId(), userAgent);

        return new AuthResult(UserResponse.from(user), accessToken, refreshToken);
    }

    @Transactional
    public AuthResult loginWithGoogle(
            String googleId, String email, String firstName, String lastName, String userAgent) {
        User user = userRepository.findByGoogleId(googleId).orElse(null);

        if (user == null) {
            User existingByEmail = userRepository.findByEmail(email).orElse(null);
            if (existingByEmail != null) {
                // Chequear antes de vincular: una cuenta inactiva no se vincula ni inicia sesión (spec HU-06).
                if (!existingByEmail.isActive()) {
                    throw new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE);
                }
                existingByEmail.linkGoogleAccount(googleId);
                user = userRepository.save(existingByEmail);
            }
        }

        if (user == null) {
            user = userRepository.save(User.fromGoogle(email, googleId, firstName, lastName));
        } else if (!user.isActive()) {
            throw new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE);
        }

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = createRefreshToken(user.getId(), userAgent);

        return new AuthResult(UserResponse.from(user), accessToken, refreshToken);
    }

    @Transactional
    public AuthResult refresh(String rawRefreshToken, String userAgent) {
        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(hash(rawRefreshToken))
                .filter(token -> token.getRevokedAt() == null)
                .filter(token -> token.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new SessionExpiredException(SESSION_EXPIRED_MESSAGE));

        User user = userRepository
                .findById(stored.getUserId())
                .filter(User::isActive)
                .orElseThrow(() -> new SessionExpiredException(SESSION_EXPIRED_MESSAGE));

        stored.revoke();

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = createRefreshToken(user.getId(), userAgent);

        return new AuthResult(UserResponse.from(user), accessToken, refreshToken);
    }

    /** Idempotente: un token desconocido, ya revocado o vencido no es un error (HU-05). */
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenRepository
                .findByTokenHash(hash(rawRefreshToken))
                .filter(token -> token.getRevokedAt() == null)
                .ifPresent(RefreshToken::revoke);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        return userRepository
                .findById(userId)
                .map(UserResponse::from)
                .orElseThrow(() -> new InsufficientAuthenticationException("Usuario no encontrado."));
    }

    private String createRefreshToken(Long userId, String userAgent) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        String trimmedUserAgent = userAgent == null
                ? null
                : userAgent.substring(0, Math.min(userAgent.length(), USER_AGENT_MAX_LENGTH));

        RefreshToken refreshToken = new RefreshToken(
                userId, hash(rawToken), trimmedUserAgent, Instant.now().plus(SessionCookieFactory.REFRESH_TOKEN_TTL));
        refreshTokenRepository.save(refreshToken);

        return rawToken;
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
