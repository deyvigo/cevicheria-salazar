package com.salazar.api.perfil;

import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;

public final class AuthenticatedUser {
    private AuthenticatedUser() {}

    public static Long id(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new InsufficientAuthenticationException("No hay sesión.");
        }
        return userId;
    }
}
