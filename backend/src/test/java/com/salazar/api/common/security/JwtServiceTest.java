package com.salazar.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "test-only-secret-not-for-production-use-32byte";

    private final JwtService jwtService = new JwtService(SECRET, 15);

    @Test
    void parsesAValidToken() {
        String token = jwtService.generateAccessToken(7L, "maria@correo.com", "CLIENTE");

        var claims = jwtService.parse(token);

        assertThat(claims).isPresent();
        assertThat(claims.get().getSubject()).isEqualTo("7");
        assertThat(claims.get().get("role", String.class)).isEqualTo("CLIENTE");
    }

    @Test
    void returnsEmptyForATokenSignedWithAnotherKey() {
        String foreign = new JwtService("another-secret-not-for-production-use-32by", 15)
                .generateAccessToken(7L, "maria@correo.com", "CLIENTE");

        assertThat(jwtService.parse(foreign)).isEmpty();
    }

    @Test
    void returnsEmptyForAMalformedOrExpiredToken() {
        assertThat(jwtService.parse("no-es-un-jwt")).isEmpty();
        String expired = new JwtService(SECRET, -1).generateAccessToken(7L, "maria@correo.com", "CLIENTE");
        assertThat(jwtService.parse(expired)).isEmpty();
    }
}
