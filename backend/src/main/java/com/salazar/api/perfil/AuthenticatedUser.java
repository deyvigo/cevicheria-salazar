package com.salazar.api.perfil;

import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;

final class AuthenticatedUser {
    private AuthenticatedUser() {}

    static Long id(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new InsufficientAuthenticationException("No hay sesión.");
        }
        return userId;
    }
}
