package com.salazar.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

class SessionCookieFactoryTest {
    private final JwtService jwtService = mock(JwtService.class);

    @Test
    void clearCookiesExpireWithTheSameAttributesAsTheSessionCookies() {
        when(jwtService.getAccessTokenTtl()).thenReturn(Duration.ofMinutes(15));
        SessionCookieFactory factory = new SessionCookieFactory(jwtService);

        assertCleared(factory.clearAccessTokenCookie(), factory.accessTokenCookie("jwt"), "access_token");
        assertCleared(factory.clearRefreshTokenCookie(), factory.refreshTokenCookie("raw"), "refresh_token");
    }

    private void assertCleared(ResponseCookie cleared, ResponseCookie original, String name) {
        assertThat(cleared.getName()).isEqualTo(name);
        assertThat(cleared.getValue()).isEmpty();
        assertThat(cleared.getMaxAge()).isEqualTo(Duration.ZERO);
        assertThat(cleared.isHttpOnly()).isEqualTo(original.isHttpOnly()).isTrue();
        assertThat(cleared.isSecure()).isEqualTo(original.isSecure()).isTrue();
        assertThat(cleared.getSameSite()).isEqualTo(original.getSameSite()).isEqualTo("Strict");
        assertThat(cleared.getPath()).isEqualTo(original.getPath()).isEqualTo("/");
    }
}
