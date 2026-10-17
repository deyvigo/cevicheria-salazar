package com.salazar.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.dto.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
@TestPropertySource(
        properties = {
            "app.default-admin.enabled=true",
            "app.default-admin.email=admin-it@cevicheria-salazar.com",
            "app.default-admin.password=Clave1234"
        })
class DefaultAdminIT {
    private static final String EMAIL = "admin-it@cevicheria-salazar.com";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DefaultAdminInitializer initializer;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Own instance: the app uses Jackson 3, this one only serializes the request body
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void startupCreatesAnAdministratorWhoCanLogIn() throws Exception {
        User admin = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(admin.getRole()).isEqualTo(UserRole.ADMINISTRADOR);
        assertThat(admin.isEmailVerified()).isTrue();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(EMAIL, "Clave1234"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMINISTRADOR"));
    }

    @Test
    void runningAgainKeepsAChangedPasswordAndDoesNotDuplicate() {
        User admin = userRepository.findByEmail(EMAIL).orElseThrow();
        String originalHash = admin.getPasswordHash();
        admin.changePassword(passwordEncoder.encode("OtraClave99"));
        userRepository.save(admin);

        try {
            initializer.run(null);

            User reloaded = userRepository.findByEmail(EMAIL).orElseThrow();
            assertThat(passwordEncoder.matches("OtraClave99", reloaded.getPasswordHash()))
                    .isTrue();
            assertThat(userRepository.findAll().stream().filter(u -> u.getRole() == UserRole.ADMINISTRADOR))
                    .hasSize(1);
        } finally {
            // The context and database are shared with the login test
            admin = userRepository.findByEmail(EMAIL).orElseThrow();
            admin.changePassword(originalHash);
            userRepository.save(admin);
        }
    }
}
