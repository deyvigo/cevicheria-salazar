package com.salazar.api.auth;

import com.salazar.api.auth.dto.PasswordRules;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@EnableConfigurationProperties(DefaultAdminProperties.class)
@RequiredArgsConstructor
public class DefaultAdminInitializer implements ApplicationRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final DefaultAdminProperties properties;
    private final Environment environment;

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.enabled() || userRepository.existsByRole(UserRole.ADMINISTRADOR)) {
            return;
        }

        boolean production = environment.acceptsProfiles(Profiles.of("prod"));
        String missing = missingSetting();
        if (missing != null) {
            if (production) {
                throw new IllegalStateException("No administrator exists and " + missing + " is not valid; set it to create the default account");
            }
            log.warn("Default administrator not created: {} is not set", missing);
            return;
        }

        if (userRepository.findByEmail(properties.email()).isPresent()) {
            log.warn("Default administrator not created: {} already belongs to another account", properties.email());
            return;
        }

        User admin = User.administrator(
                properties.email(),
                passwordEncoder.encode(properties.password()),
                properties.firstName(),
                properties.lastName(),
                StringUtils.hasText(properties.phone()) ? properties.phone() : null);
        try {
            userRepository.save(admin);
            log.info("Default administrator created: {}", properties.email());
        } catch (DataIntegrityViolationException ex) {
            // Another instance won the race on the unique email
            log.info("Default administrator already created by another instance");
        }
    }

    private String missingSetting() {
        if (!StringUtils.hasText(properties.email())) {
            return "APP_DEFAULT_ADMIN_EMAIL";
        }
        String password = properties.password();
        boolean valid = StringUtils.hasText(password)
                && password.length() <= PasswordRules.MAX_LENGTH
                && password.matches(PasswordRules.REGEXP);
        return valid ? null : "APP_DEFAULT_ADMIN_PASSWORD";
    }
}
