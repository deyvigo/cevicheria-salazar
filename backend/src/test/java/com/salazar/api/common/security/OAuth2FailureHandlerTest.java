package com.salazar.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;

class OAuth2FailureHandlerTest {
    @Test
    void redirectsToTheLoginPageWithTheGoogleErrorFlag() throws Exception {
        OAuth2FailureHandler handler = new OAuth2FailureHandler("http://localhost:5173");

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        handler.onAuthenticationFailure(request, response, new BadCredentialsException("denegado"));

        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/iniciar-sesion?error=google");
    }
}
