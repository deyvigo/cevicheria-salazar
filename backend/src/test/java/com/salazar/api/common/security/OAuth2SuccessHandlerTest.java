package com.salazar.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.AuthResult;
import com.salazar.api.auth.AuthService;
import com.salazar.api.auth.dto.UserResponse;
import com.salazar.api.common.exception.InvalidCredentialsException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

@ExtendWith(MockitoExtension.class)
class OAuth2SuccessHandlerTest {

    @Mock
    private AuthService authService;

    @Mock
    private Authentication authentication;

    private OAuth2SuccessHandler handler;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        JwtService jwtService = new JwtService("test-only-secret-not-for-production-use-32byte", 15);
        SessionCookieFactory sessionCookieFactory = new SessionCookieFactory(jwtService);
        handler = new OAuth2SuccessHandler(authService, sessionCookieFactory, "http://localhost:5173");
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    private OAuth2User googleUser() {
        return new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of(
                        "sub", "google-123",
                        "email", "maria@correo.com",
                        "given_name", "María",
                        "family_name", "Quispe"),
                "sub");
    }

    @Test
    void onSuccessSetsCookiesAndRedirectsToTheFrontendHome() throws Exception {
        when(authentication.getPrincipal()).thenReturn(googleUser());
        when(authService.loginWithGoogle("google-123", "maria@correo.com", "María", "Quispe", null))
                .thenReturn(new AuthResult(
                        new UserResponse(1L, "maria@correo.com", "María", "Quispe", null, "CLIENTE", true),
                        "jwt-token",
                        "refresh-token"));

        handler.onAuthenticationSuccess(request, response, authentication);

        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/");
        List<String> cookies = response.getHeaders(HttpHeaders.SET_COOKIE);
        assertThat(cookies).anyMatch(cookie -> cookie.startsWith("access_token=jwt-token"));
        assertThat(cookies).anyMatch(cookie -> cookie.startsWith("refresh_token=refresh-token"));
    }

    @Test
    void onSuccessRedirectsToTheLoginErrorPageWhenTheAccountIsInactiveAndSetsNoCookies() throws Exception {
        when(authentication.getPrincipal()).thenReturn(googleUser());
        when(authService.loginWithGoogle(any(), any(), any(), any(), any()))
                .thenThrow(new InvalidCredentialsException("Correo o contraseña incorrectos."));

        handler.onAuthenticationSuccess(request, response, authentication);

        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/iniciar-sesion?error=google");
        assertThat(response.getHeaders(HttpHeaders.SET_COOKIE)).isEmpty();
    }

    @Test
    void onSuccessFallsBackToTheFullNameWhenGivenNameIsMissing() throws Exception {
        OAuth2User userWithoutGivenName = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("sub", "google-456", "email", "ana@correo.com", "name", "Ana Torres"),
                "sub");
        when(authentication.getPrincipal()).thenReturn(userWithoutGivenName);
        when(authService.loginWithGoogle("google-456", "ana@correo.com", "Ana Torres", "", null))
                .thenReturn(new AuthResult(
                        new UserResponse(2L, "ana@correo.com", "Ana Torres", "", null, "CLIENTE", true),
                        "jwt-token",
                        "refresh-token"));

        handler.onAuthenticationSuccess(request, response, authentication);

        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/");
    }
}
