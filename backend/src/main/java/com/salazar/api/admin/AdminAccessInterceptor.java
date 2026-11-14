package com.salazar.api.admin;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class AdminAccessInterceptor implements HandlerInterceptor {
    private final UserRepository userRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // The check already passed when the request started; async completion (SSE) has no fresh authentication
        if (request.getDispatcherType() == DispatcherType.ASYNC) {
            return true;
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new InsufficientAuthenticationException("No hay sesión.");
        }
        // The token's role claim can outlive a role change or a deactivation, so the database decides
        boolean allowed = userRepository
                .findById(userId)
                .filter(User::isActive)
                .map(User::getRole)
                .filter(UserRole.ADMINISTRADOR::equals)
                .isPresent();
        if (!allowed) {
            throw new AccessDeniedException("Se requiere rol de administrador.");
        }
        return true;
    }
}
