package com.salazar.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminAccessInterceptorTest {
    @Mock
    private UserRepository userRepository;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private boolean preHandle() {
        return new AdminAccessInterceptor(userRepository)
                .preHandle(new MockHttpServletRequest(), new MockHttpServletResponse(), new Object());
    }

    private void authenticateAs(long userId) {
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(
                        userId, null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));
    }

    private User user(UserRole role, boolean active) {
        User user = new User("a@b.com", "hash", "A", "B", null, role);
        ReflectionTestUtils.setField(user, "active", active);
        return user;
    }

    @Test
    void withoutSessionItIsNotAuthenticated() {
        assertThatThrownBy(this::preHandle).isInstanceOf(InsufficientAuthenticationException.class);
    }

    @Test
    void aCustomerIsDenied() {
        authenticateAs(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(UserRole.CLIENTE, true)));

        assertThatThrownBy(this::preHandle).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void aDeactivatedAdministratorIsDenied() {
        authenticateAs(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(UserRole.ADMINISTRADOR, false)));

        assertThatThrownBy(this::preHandle).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void aMissingUserIsDenied() {
        authenticateAs(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(this::preHandle).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void anActiveAdministratorPasses() {
        authenticateAs(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(UserRole.ADMINISTRADOR, true)));

        assertThat(preHandle()).isTrue();
    }
}
