package com.salazar.api.common.security;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Construye las dos cookies de sesión (`access_token`/`refresh_token`), para
 * que {@code AuthController} (register/login) y el flujo de Google (HU-06,
 * que no pasa por un controlador) no dupliquen sus atributos.
 */
@Component
public class SessionCookieFactory {

    public static final String ACCESS_TOKEN_COOKIE = "access_token";
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    /** Vive aquí (no en AuthService) para que auth dependa de common, nunca al revés. */
    public static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(30);

    private final JwtService jwtService;

    public SessionCookieFactory(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    public ResponseCookie accessTokenCookie(String accessToken) {
        return cookie(ACCESS_TOKEN_COOKIE, accessToken, jwtService.getAccessTokenTtl());
    }

    public ResponseCookie refreshTokenCookie(String refreshToken) {
        return cookie(REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_TOKEN_TTL);
    }

    private ResponseCookie cookie(String name, String value, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
