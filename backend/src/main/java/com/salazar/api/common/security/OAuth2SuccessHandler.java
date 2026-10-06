package com.salazar.api.common.security;

import com.salazar.api.auth.AuthResult;
import com.salazar.api.auth.AuthService;
import com.salazar.api.common.exception.InvalidCredentialsException;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.DefaultRedirectStrategy;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {
    private final AuthService authService;
    private final SessionCookieFactory sessionCookieFactory;
    private final String frontendUrl;
    private final RedirectStrategy redirectStrategy = new DefaultRedirectStrategy();

    public OAuth2SuccessHandler(
            AuthService authService,
            SessionCookieFactory sessionCookieFactory,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.authService = authService;
        this.sessionCookieFactory = sessionCookieFactory;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String googleId = oAuth2User.getName();
        String email = oAuth2User.getAttribute("email");
        String givenName = oAuth2User.getAttribute("given_name");
        String familyName = oAuth2User.getAttribute("family_name");

        // first_name/last_name are NOT NULL, so never leave them null
        if (givenName == null) {
            givenName = oAuth2User.getAttribute("name");
            familyName = "";
        }

        try {
            String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
            AuthResult result = authService.loginWithGoogle(googleId, email, givenName, familyName, userAgent);

            response.addHeader(
                    HttpHeaders.SET_COOKIE,
                    sessionCookieFactory.accessTokenCookie(result.accessToken()).toString());
            response.addHeader(
                    HttpHeaders.SET_COOKIE,
                    sessionCookieFactory.refreshTokenCookie(result.refreshToken()).toString());

            redirectStrategy.sendRedirect(request, response, frontendUrl + "/");
        } catch (InvalidCredentialsException ex) {
            redirectStrategy.sendRedirect(request, response, frontendUrl + "/iniciar-sesion?error=google");
        }
    }
}
