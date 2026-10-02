package com.salazar.api.auth;

import com.salazar.api.auth.dto.RegisterRequest;
import com.salazar.api.auth.dto.UserResponse;
import com.salazar.api.common.exception.FieldConflictException;
import com.salazar.api.common.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    /** Visible para que `AuthController` fije el mismo `maxAge` en la cookie, sin duplicar el valor. */
    public static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(30);

    private static final int USER_AGENT_MAX_LENGTH = 255;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
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

    private String createRefreshToken(Long userId, String userAgent) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        String trimmedUserAgent = userAgent == null
                ? null
                : userAgent.substring(0, Math.min(userAgent.length(), USER_AGENT_MAX_LENGTH));

        RefreshToken refreshToken = new RefreshToken(
                userId, hash(rawToken), trimmedUserAgent, Instant.now().plus(REFRESH_TOKEN_TTL));
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
