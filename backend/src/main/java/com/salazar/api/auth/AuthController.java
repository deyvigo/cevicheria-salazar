package com.salazar.api.auth;

import com.salazar.api.auth.dto.LoginRequest;
import com.salazar.api.auth.dto.RegisterRequest;
import com.salazar.api.auth.dto.UserResponse;
import com.salazar.api.common.security.SessionCookieFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final SessionCookieFactory sessionCookieFactory;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        AuthResult result = authService.register(request, httpRequest.getHeader(HttpHeaders.USER_AGENT));
        return withSessionCookies(ResponseEntity.status(HttpStatus.CREATED), result);
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        AuthResult result = authService.login(request, httpRequest.getHeader(HttpHeaders.USER_AGENT));
        return withSessionCookies(ResponseEntity.ok(), result);
    }

    private ResponseEntity<UserResponse> withSessionCookies(ResponseEntity.BodyBuilder response, AuthResult result) {
        return response
                .header(
                        HttpHeaders.SET_COOKIE,
                        sessionCookieFactory.accessTokenCookie(result.accessToken()).toString())
                .header(
                        HttpHeaders.SET_COOKIE,
                        sessionCookieFactory.refreshTokenCookie(result.refreshToken()).toString())
                .body(result.user());
    }
}
