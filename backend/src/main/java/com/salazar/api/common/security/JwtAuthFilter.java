package com.salazar.api.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        SessionCookieFactory.readCookie(request, SessionCookieFactory.ACCESS_TOKEN_COOKIE)
                .flatMap(jwtService::parse)
                .ifPresent(claims -> {
                    Long userId = Long.valueOf(claims.getSubject());
                    var authority = new SimpleGrantedAuthority("ROLE_" + claims.get("role", String.class));
                    SecurityContextHolder.getContext()
                            .setAuthentication(new UsernamePasswordAuthenticationToken(userId, null, List.of(authority)));
                });
        filterChain.doFilter(request, response);
    }
}
