package com.salazar.api.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.dto.LoginRequest;
import com.salazar.api.auth.dto.RegisterRequest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, AdminAccessIT.ProbeConfig.class})
@WithTestSecrets
@TestPropertySource(
        properties = {
            "app.default-admin.enabled=true",
            "app.default-admin.email=admin-access-it@cevicheria-salazar.com",
            "app.default-admin.password=Clave1234"
        })
class AdminAccessIT {
    private static final String ADMIN_EMAIL = "admin-access-it@cevicheria-salazar.com";
    private static final String CUSTOMER_EMAIL = "cliente-access-it@example.com";
    private static final String PROBE = "/api/admin/_probe";

    @TestConfiguration
    static class ProbeConfig {
        @RestController
        @RequestMapping(PROBE)
        static class ProbeController {
            @GetMapping
            String probe() {
                return "ok";
            }
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Own instance: the app uses Jackson 3, this one only serializes the request body
    private final ObjectMapper objectMapper = new ObjectMapper();

    @AfterEach
    void restoreAdministrator() {
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR', is_active = true WHERE email = ?", ADMIN_EMAIL);
    }

    private Cookie loginCookie(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie("access_token");
    }

    @Test
    void withoutSessionItIsUnauthorized() throws Exception {
        mockMvc.perform(get(PROBE)).andExpect(status().isUnauthorized());
    }

    @Test
    void aCustomerIsForbidden() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(CUSTOMER_EMAIL, "Clave1234", "Ana", "Perez", "987654321"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get(PROBE).cookie(loginCookie(CUSTOMER_EMAIL, "Clave1234")))
                .andExpect(status().isForbidden());
    }

    @Test
    void theAdministratorGetsIn() throws Exception {
        mockMvc.perform(get(PROBE).cookie(loginCookie(ADMIN_EMAIL, "Clave1234")))
                .andExpect(status().isOk());
    }

    @Test
    void aDeactivatedAdministratorIsForbiddenWithAStillValidToken() throws Exception {
        Cookie token = loginCookie(ADMIN_EMAIL, "Clave1234");
        jdbcTemplate.update("UPDATE users SET is_active = false WHERE email = ?", ADMIN_EMAIL);

        mockMvc.perform(get(PROBE).cookie(token)).andExpect(status().isForbidden());
    }

    @Test
    void anAdministratorDemotedToCustomerIsForbiddenWithAStillValidToken() throws Exception {
        Cookie token = loginCookie(ADMIN_EMAIL, "Clave1234");
        jdbcTemplate.update("UPDATE users SET role = 'CLIENTE' WHERE email = ?", ADMIN_EMAIL);

        mockMvc.perform(get(PROBE).cookie(token)).andExpect(status().isForbidden());
    }
}
