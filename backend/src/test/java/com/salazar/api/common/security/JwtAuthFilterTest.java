package com.salazar.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

class JwtAuthFilterTest {
    private final JwtService jwtService = new JwtService("test-only-secret-not-for-production-use-32byte", 15);
    private final JwtAuthFilter filter = new JwtAuthFilter(jwtService);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private MockFilterChain run(MockHttpServletRequest request) throws Exception {
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        return chain;
    }

    @Test
    void validCookiePopulatesTheSecurityContext() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(
                SessionCookieFactory.ACCESS_TOKEN_COOKIE,
                jwtService.generateAccessToken(7L, "maria@correo.com", "CLIENTE")));

        MockFilterChain chain = run(request);

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication.getPrincipal()).isEqualTo(7L);
        assertThat(authentication.getAuthorities()).extracting(Object::toString).containsExactly("ROLE_CLIENTE");
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void missingOrInvalidCookieLeavesTheRequestAnonymous() throws Exception {
        run(new MockHttpServletRequest());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();

        MockHttpServletRequest invalid = new MockHttpServletRequest();
        invalid.setCookies(new Cookie(SessionCookieFactory.ACCESS_TOKEN_COOKIE, "manipulado"));
        MockFilterChain chain = run(invalid);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(chain.getRequest()).isNotNull();
    }
}
