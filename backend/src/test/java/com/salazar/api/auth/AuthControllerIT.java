package com.salazar.api.auth;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.dto.LoginRequest;
import com.salazar.api.auth.dto.RegisterRequest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class AuthControllerIT {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    // Own instance: the app uses Jackson 3, this one only serializes the request body
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String registerBody(String email, String phone) throws Exception {
        return objectMapper.writeValueAsString(new RegisterRequest(email, "clave1234", "María", "Quispe", phone));
    }

    private String loginBody(String email, String password) throws Exception {
        return objectMapper.writeValueAsString(new LoginRequest(email, password));
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

    @Test
    void successfulLoginReturns200WithCookiesAndUserProfile() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody("login-ok@correo.com", "987000001")));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("login-ok@correo.com", "clave1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("login-ok@correo.com"))
                .andExpect(header().string("Set-Cookie", containsString("access_token=")));
    }

    @Test
    void wrongPasswordReturns401WithTheGenericMessage() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody("login-bad-pass@correo.com", "987000002")));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("login-bad-pass@correo.com", "incorrecta123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Correo o contraseña incorrectos."))
                .andExpect(jsonPath("$.fieldErrors").isEmpty());
    }

    @Test
    void nonExistentEmailReturnsTheSameGenericMessage() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("no-existe-login@correo.com", "cualquier-cosa")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Correo o contraseña incorrectos."));
    }

    @Test
    void inactiveAccountReturnsTheSameGenericMessage() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody("login-inactiva@correo.com", "987000003")));

        User user = userRepository.findByEmail("login-inactiva@correo.com").orElseThrow();
        user.deactivate();
        userRepository.save(user);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("login-inactiva@correo.com", "clave1234")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Correo o contraseña incorrectos."));
    }

    @Test
    void blocksAfterThreeFailedAttempts() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody("login-bloqueo@correo.com", "987000004")));

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginBody("login-bloqueo@correo.com", "incorrecta")))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("login-bloqueo@correo.com", "clave1234")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Demasiados intentos. Espera unos minutos e inténtalo de nuevo."));
    }

    @Test
    void meReturnsTheProfileAndRefreshRotatesTheTokenOnlyOnce() throws Exception {
        MvcResult registered = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("sesion@correo.com", "987000010")))
                .andReturn();
        Cookie access = registered.getResponse().getCookie("access_token");
        Cookie refresh = registered.getResponse().getCookie("refresh_token");

        mockMvc.perform(get("/api/auth/me").cookie(access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("sesion@correo.com"));

        mockMvc.perform(post("/api/auth/refresh").cookie(refresh))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("sesion@correo.com"))
                .andExpect(header().stringValues("Set-Cookie", hasItem(containsString("access_token="))))
                .andExpect(header().stringValues("Set-Cookie", hasItem(containsString("refresh_token="))));

        mockMvc.perform(post("/api/auth/refresh").cookie(refresh))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Tu sesión expiró. Inicia sesión de nuevo."));
    }

    @Test
    void meWithoutCookieOrWithATamperedOneReturns401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Debes iniciar sesión para continuar."));

        mockMvc.perform(get("/api/auth/me").cookie(new Cookie("access_token", "manipulado")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesTheRefreshTokenAndExpiresTheCookies() throws Exception {
        MvcResult registered = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("salir@correo.com", "987000020")))
                .andReturn();
        Cookie access = registered.getResponse().getCookie("access_token");
        Cookie refresh = registered.getResponse().getCookie("refresh_token");

        mockMvc.perform(post("/api/auth/logout").cookie(access, refresh))
                .andExpect(status().isNoContent())
                .andExpect(header().stringValues("Set-Cookie", hasItem(containsString("access_token=; Path=/; Max-Age=0"))))
                .andExpect(header().stringValues("Set-Cookie", hasItem(containsString("refresh_token=; Path=/; Max-Age=0"))));

        mockMvc.perform(post("/api/auth/refresh").cookie(refresh))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Tu sesión expiró. Inicia sesión de nuevo."));

        mockMvc.perform(post("/api/auth/logout").cookie(refresh)).andExpect(status().isNoContent());
    }

    @Test
    void logoutWithoutCookiesReturns204() throws Exception {
        mockMvc.perform(post("/api/auth/logout")).andExpect(status().isNoContent());
    }

    @Test
    void logoutOnlyClosesTheCurrentDevice() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody("dos@correo.com", "987000021")));
        Cookie deviceA = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("dos@correo.com", "clave1234")))
                .andReturn()
                .getResponse()
                .getCookie("refresh_token");
        Cookie deviceB = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("dos@correo.com", "clave1234")))
                .andReturn()
                .getResponse()
                .getCookie("refresh_token");

        mockMvc.perform(post("/api/auth/logout").cookie(deviceA)).andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/refresh").cookie(deviceA)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/refresh").cookie(deviceB)).andExpect(status().isOk());
    }

    @Test
    void refreshWithoutCookieReturns401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Tu sesión expiró. Inicia sesión de nuevo."));
    }
}
