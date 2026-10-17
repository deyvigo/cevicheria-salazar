package com.salazar.api.perfil;

import com.salazar.api.auth.dto.UserResponse;
import com.salazar.api.common.security.SessionCookieFactory;
import com.salazar.api.perfil.dto.ChangePasswordRequest;
import com.salazar.api.perfil.dto.UpdateProfileRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/perfil")
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileService profileService;

    @PutMapping
    public UserResponse updateProfile(Authentication authentication, @Valid @RequestBody UpdateProfileRequest request) {
        return profileService.updateProfile(userId(authentication), request);
    }

    @PutMapping("/contrasena")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        String refreshToken = SessionCookieFactory.readCookie(httpRequest, SessionCookieFactory.REFRESH_TOKEN_COOKIE)
                .orElse(null);
        profileService.changePassword(userId(authentication), request, refreshToken);
        return ResponseEntity.noContent().build();
    }

    private Long userId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new InsufficientAuthenticationException("No hay sesión.");
        }
        return userId;
    }
}
