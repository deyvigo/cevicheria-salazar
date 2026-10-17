package com.salazar.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class DefaultAdminInitializerTest {
    private static final String EMAIL = "admin@cevicheria-salazar.com";
    private static final String PASSWORD = "Clave1234";

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private DefaultAdminInitializer initializer(boolean enabled, String email, String password, String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        DefaultAdminProperties properties =
                new DefaultAdminProperties(enabled, email, password, "Administrador", "Salazar", "");
        return new DefaultAdminInitializer(userRepository, passwordEncoder, properties, environment);
    }

    @Test
    void createsVerifiedActiveAdministratorWithHashedPassword() {
        when(userRepository.existsByRole(UserRole.ADMINISTRADOR)).thenReturn(false);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(PASSWORD)).thenReturn("hash");

        initializer(true, EMAIL, PASSWORD, "dev").run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        User admin = saved.getValue();
        assertThat(admin.getRole()).isEqualTo(UserRole.ADMINISTRADOR);
        assertThat(admin.getEmail()).isEqualTo(EMAIL);
        assertThat(admin.getPasswordHash()).isEqualTo("hash");
        assertThat(admin.isEmailVerified()).isTrue();
        assertThat(admin.isActive()).isTrue();
        assertThat(admin.getPhone()).isNull();
    }

    @Test
    void doesNothingWhenAnAdministratorAlreadyExists() {
        when(userRepository.existsByRole(UserRole.ADMINISTRADOR)).thenReturn(true);

        initializer(true, EMAIL, PASSWORD, "prod").run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void doesNothingWhenDisabled() {
        initializer(false, EMAIL, PASSWORD, "dev").run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void doesNotPromoteAClientThatUsesTheDefaultEmail() {
        when(userRepository.existsByRole(UserRole.ADMINISTRADOR)).thenReturn(false);
        when(userRepository.findByEmail(EMAIL))
                .thenReturn(Optional.of(new User(EMAIL, "hash", "Ana", "Pérez", null, UserRole.CLIENTE)));

        initializer(true, EMAIL, PASSWORD, "dev").run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void failsInProductionWithoutPassword() {
        when(userRepository.existsByRole(UserRole.ADMINISTRADOR)).thenReturn(false);

        assertThatThrownBy(() -> initializer(true, EMAIL, "", "prod").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_DEFAULT_ADMIN_PASSWORD");
    }

    @Test
    void failsInProductionWithoutEmail() {
        when(userRepository.existsByRole(UserRole.ADMINISTRADOR)).thenReturn(false);

        assertThatThrownBy(() -> initializer(true, "", PASSWORD, "prod").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_DEFAULT_ADMIN_EMAIL");
    }

    @Test
    void failsInProductionWithWeakPassword() {
        when(userRepository.existsByRole(UserRole.ADMINISTRADOR)).thenReturn(false);

        assertThatThrownBy(() -> initializer(true, EMAIL, "corta", "prod").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_DEFAULT_ADMIN_PASSWORD");
    }

    @Test
    void skipsOutsideProductionWhenPasswordIsMissing() {
        when(userRepository.existsByRole(UserRole.ADMINISTRADOR)).thenReturn(false);

        assertThatCode(() -> initializer(true, EMAIL, "", "dev").run(null)).doesNotThrowAnyException();

        verify(userRepository, never()).save(any());
    }

    @Test
    void treatsUniqueEmailConflictAsAlreadyCreated() {
        when(userRepository.existsByRole(UserRole.ADMINISTRADOR)).thenReturn(false);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(PASSWORD)).thenReturn("hash");
        when(userRepository.save(any())).thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatCode(() -> initializer(true, EMAIL, PASSWORD, "dev").run(null)).doesNotThrowAnyException();
    }
}
