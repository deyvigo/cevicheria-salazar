package com.salazar.api.perfil;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.dto.LoginRequest;
import com.salazar.api.auth.dto.RegisterRequest;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class ProfileControllerIT {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private record Session(String email, Cookie access, Cookie refresh) {}

    private Session session(MvcResult result, String email) {
        return new Session(
                email,
                result.getResponse().getCookie("access_token"),
                result.getResponse().getCookie("refresh_token"));
    }

    private Session register() throws Exception {
        String email = "perfil-" + UUID.randomUUID() + "@correo.com";
        String phone = "9" + String.format("%08d", Math.abs(UUID.randomUUID().getLeastSignificantBits()) % 100_000_000);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(email, "clave1234", "María", "Quispe", phone))))
                .andExpect(status().isCreated())
                .andReturn();
        return session(result, email);
    }

    private Session login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();
        return session(result, email);
    }

    private ResultActions updateProfile(Session session, Map<String, String> body) throws Exception {
        return mockMvc.perform(put("/api/perfil")
                .cookie(session.access())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions changePassword(Session session, Map<String, String> body) throws Exception {
        return mockMvc.perform(put("/api/perfil/contrasena")
                .cookie(session.access(), session.refresh())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions refresh(Session session) throws Exception {
        return mockMvc.perform(post("/api/auth/refresh").cookie(session.refresh()));
    }

    @Test
    void withoutSessionItIsUnauthorized() throws Exception {
        mockMvc.perform(put("/api/perfil")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"A\",\"lastName\":\"B\",\"phone\":\"912345678\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/perfil/contrasena")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"nueva5678\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anAdministratorEditsTheirOwnDataAndPassword() throws Exception {
        Session current = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", current.email());
        Session other = login(current.email(), "clave1234");

        updateProfile(current, Map.of("firstName", "Rosa", "lastName", "Salazar", "phone", "912345678"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMINISTRADOR"))
                .andExpect(jsonPath("$.firstName").value("Rosa"));
        mockMvc.perform(get("/api/auth/me").cookie(current.access()))
                .andExpect(jsonPath("$.phone").value("912345678"));

        changePassword(current, Map.of("currentPassword", "clave1234", "newPassword", "nueva5678"))
                .andExpect(status().isNoContent());

        refresh(current).andExpect(status().isOk());
        refresh(other).andExpect(status().isUnauthorized());
        login(current.email(), "nueva5678");
    }

    @Test
    void aDeactivatedAccountCannotEdit() throws Exception {
        Session session = register();
        jdbcTemplate.update("UPDATE users SET is_active = false WHERE email = ?", session.email());

        updateProfile(session, Map.of("firstName", "A", "lastName", "B", "phone", "912345678"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updatesTheBasicDataAndMeReflectsIt() throws Exception {
        Session session = register();

        updateProfile(session, Map.of("firstName", " Ana ", "lastName", "Torres", "phone", "912345678"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Ana"))
                .andExpect(jsonPath("$.phone").value("912345678"));

        mockMvc.perform(get("/api/auth/me").cookie(session.access()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lastName").value("Torres"))
                .andExpect(jsonPath("$.hasPassword").value(true));
    }

    @Test
    void rejectsEmptyAndMalformedData() throws Exception {
        Session session = register();

        updateProfile(session, Map.of("firstName", " ", "lastName", "Torres", "phone", "812345678"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='firstName')]").exists())
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='phone')]").exists());
    }

    @Test
    void changingThePasswordKeepsTheCurrentSessionAndClosesTheOthers() throws Exception {
        Session current = register();
        Session other = login(current.email(), "clave1234");

        changePassword(current, Map.of("currentPassword", "clave1234", "newPassword", "nueva5678"))
                .andExpect(status().isNoContent());

        refresh(current).andExpect(status().isOk());
        refresh(other).andExpect(status().isUnauthorized());
        login(current.email(), "nueva5678");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(current.email(), "clave1234"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongCurrentPasswordIsReportedOnItsFieldAndBlocksAfterThreeAttempts() throws Exception {
        Session session = register();
        Map<String, String> wrong = Map.of("currentPassword", "mala1234", "newPassword", "nueva5678");

        for (int i = 0; i < 3; i++) {
            changePassword(session, wrong)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors[0].field").value("currentPassword"));
        }

        changePassword(session, Map.of("currentPassword", "clave1234", "newPassword", "nueva5678"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void newPasswordMustDifferFromTheCurrentOne() throws Exception {
        Session session = register();

        changePassword(session, Map.of("currentPassword", "clave1234", "newPassword", "clave1234"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("newPassword"));
    }

    @Test
    void aGoogleAccountCreatesItsPasswordAndThenSignsInWithIt() throws Exception {
        Session session = register();
        jdbcTemplate.update("UPDATE users SET password_hash = NULL WHERE email = ?", session.email());

        mockMvc.perform(get("/api/auth/me").cookie(session.access()))
                .andExpect(jsonPath("$.hasPassword").value(false));

        changePassword(session, Map.of("newPassword", "nueva5678")).andExpect(status().isNoContent());

        login(session.email(), "nueva5678");
    }
}
