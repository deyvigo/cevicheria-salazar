package com.salazar.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.dto.ForgotPasswordRequest;
import com.salazar.api.auth.dto.LoginRequest;
import com.salazar.api.auth.dto.RegisterRequest;
import com.salazar.api.auth.dto.ResetPasswordRequest;
import com.salazar.api.common.mail.MailService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class PasswordResetControllerIT {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @MockitoBean
    private MailService mailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String register() throws Exception {
        String email = "reset-" + UUID.randomUUID() + "@correo.com";
        String phone = "9" + String.format("%08d", Math.abs(UUID.randomUUID().getLeastSignificantBits()) % 100_000_000);
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(email, "clave1234", "María", "Quispe", phone))))
                .andExpect(status().isCreated());
        return email;
    }

    private ResultActions forgot(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ForgotPasswordRequest(email))));
    }

    private String requestTokenFor(String email) throws Exception {
        forgot(email).andExpect(status().isAccepted());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailService, org.mockito.Mockito.atLeastOnce())
                .sendPasswordResetEmail(eq(email), anyString(), link.capture());
        String last = link.getAllValues().get(link.getAllValues().size() - 1);
        return last.substring(last.indexOf("token=") + 6);
    }

    private ResultActions reset(String token, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ResetPasswordRequest(token, password))));
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(email, password))));
    }

    @Test
    void fullFlowChangesThePasswordAndTheLinkWorksOnlyOnce() throws Exception {
        String email = register();
        String token = requestTokenFor(email);

        mockMvc.perform(get("/api/auth/reset-password/validate").param("token", token))
                .andExpect(status().isNoContent());

        reset(token, "nueva5678").andExpect(status().isNoContent());

        login(email, "nueva5678").andExpect(status().isOk());
        login(email, "clave1234").andExpect(status().isUnauthorized());
        reset(token, "otra91011")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Este enlace no es válido o ya venció."));
        mockMvc.perform(get("/api/auth/reset-password/validate").param("token", token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aNewRequestInvalidatesThePreviousLink() throws Exception {
        String email = register();
        String first = requestTokenFor(email);
        String second = requestTokenFor(email);

        reset(first, "nueva5678").andExpect(status().isBadRequest());
        reset(second, "nueva5678").andExpect(status().isNoContent());
    }

    @Test
    void resettingRevokesTheOpenSessions() throws Exception {
        String email = register();
        String token = requestTokenFor(email);

        reset(token, "nueva5678").andExpect(status().isNoContent());

        assertThat(refreshTokenRepository.findAll())
                .filteredOn(t -> t.getRevokedAt() == null)
                .noneMatch(t -> t.getUserId().equals(userIdOf(email)));
    }

    @Autowired
    private UserRepository userRepository;

    private Long userIdOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    @Test
    void unknownEmailGetsTheSameResponseAndNoMail() throws Exception {
        String email = "nadie-" + UUID.randomUUID() + "@correo.com";

        forgot(email)
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message")
                        .value("Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña."));

        verify(mailService, never()).sendPasswordResetEmail(eq(email), anyString(), anyString());
    }

    @Test
    void fourthRequestInTheWindowReturns429() throws Exception {
        String email = "limite-" + UUID.randomUUID() + "@correo.com";

        forgot(email).andExpect(status().isAccepted());
        forgot(email).andExpect(status().isAccepted());
        forgot(email).andExpect(status().isAccepted());
        forgot(email)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message")
                        .value("Demasiadas solicitudes de recuperación. Inténtalo de nuevo más tarde."));
    }

    @Test
    void invalidEmailReturns400WithFieldError() throws Exception {
        forgot("no-es-correo")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'email')]").exists());
    }

    @Test
    void weakPasswordReturns400WithFieldErrorAndKeepsTheLinkUsable() throws Exception {
        String email = register();
        String token = requestTokenFor(email);

        reset(token, "corta")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'password')]").exists());

        reset(token, "nueva5678").andExpect(status().isNoContent());
    }

    @Test
    void bogusTokenReturns400() throws Exception {
        mockMvc.perform(get("/api/auth/reset-password/validate").param("token", "inexistente"))
                .andExpect(status().isBadRequest());
        reset("inexistente", "nueva5678").andExpect(status().isBadRequest());
    }

    @Test
    void resettingClearsTheLoginLockout() throws Exception {
        String email = register();
        for (int i = 0; i < 3; i++) {
            login(email, "mala-clave-" + i).andExpect(status().isUnauthorized());
        }
        login(email, "clave1234").andExpect(status().isTooManyRequests());

        String token = requestTokenFor(email);
        reset(token, "nueva5678").andExpect(status().isNoContent());

        login(email, "nueva5678").andExpect(status().isOk());
    }
}
