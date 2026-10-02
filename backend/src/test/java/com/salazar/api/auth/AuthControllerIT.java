package com.salazar.api.auth;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.auth.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "app.jwt.secret=test-only-secret-not-for-production-use-32byte")
class AuthControllerIT {

    @Autowired
    private MockMvc mockMvc;

    // Instancia propia, no el bean de Spring: la app usa el ObjectMapper de Jackson 3
    // (tools.jackson, autoconfigurado por spring-boot-starter-jackson en Boot 4.1);
    // esta solo serializa el cuerpo de la request, cualquier Jackson compatible sirve.
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String registerBody(String email, String phone) throws Exception {
        return objectMapper.writeValueAsString(new RegisterRequest(email, "clave1234", "María", "Quispe", phone));
    }

    @Test
    void successfulRegistrationReturns201WithCookiesAndUserProfile() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("nueva@correo.com", "987654321")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("nueva@correo.com"))
                .andExpect(jsonPath("$.role").value("CLIENTE"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(header().string("Set-Cookie", containsString("access_token=")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")));
    }

    @Test
    void duplicateEmailReturns409WithFieldError() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody("repetida@correo.com", "987654322")));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("repetida@correo.com", "987654323")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("email"));
    }

    @Test
    void invalidPhoneReturns400WithFieldError() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("telefono-invalido@correo.com", "12345678")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'phone')]").exists());
    }
}
