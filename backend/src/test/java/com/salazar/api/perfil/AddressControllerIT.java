package com.salazar.api.perfil;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.dto.RegisterRequest;
import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;
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
class AddressControllerIT {
    private static final String URL = "/api/perfil/direcciones";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private record Customer(String email, Cookie access) {}

    private Customer register() throws Exception {
        String email = "direcciones-" + UUID.randomUUID() + "@correo.com";
        String phone = "9" + String.format("%08d", Math.abs(UUID.randomUUID().getLeastSignificantBits()) % 100_000_000);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(email, "clave1234", "María", "Quispe", phone))))
                .andExpect(status().isCreated())
                .andReturn();
        return new Customer(email, result.getResponse().getCookie("access_token"));
    }

    private Map<String, Object> body(String label) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("label", label);
        body.put("address", "Av. Arequipa 123, Lince");
        body.put("reference", "Frente al parque");
        body.put("latitude", -12.0464);
        body.put("longitude", -77.0428);
        return body;
    }

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder builder,
            Customer customer, Object content) throws Exception {
        return mockMvc.perform(builder.cookie(customer.access())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(content)));
    }

    private long create(Customer customer, String label) throws Exception {
        MvcResult result = send(post(URL), customer, body(label)).andExpect(status().isCreated()).andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    @Test
    void withoutSessionItIsUnauthorized() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body("Casa"))))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete(URL + "/1")).andExpect(status().isUnauthorized());
    }

    @Test
    void anAdministratorIsForbidden() throws Exception {
        Customer admin = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", admin.email());

        mockMvc.perform(get(URL).cookie(admin.access())).andExpect(status().isForbidden());
        send(post(URL), admin, body("Casa")).andExpect(status().isForbidden());
    }

    @Test
    void createsAnAddressAndListsItNewestFirst() throws Exception {
        Customer customer = register();
        mockMvc.perform(get(URL).cookie(customer.access()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        send(post(URL), customer, body(" Casa "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Casa"))
                .andExpect(jsonPath("$.latitude").value(-12.0464))
                .andExpect(jsonPath("$.userId").doesNotExist());
        create(customer, "Trabajo");

        mockMvc.perform(get(URL).cookie(customer.access()))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].label").value("Trabajo"))
                .andExpect(jsonPath("$[1].label").value("Casa"));
    }

    @Test
    void rejectsInvalidData() throws Exception {
        Customer customer = register();

        Map<String, Object> blank = body("  ");
        blank.put("address", "");
        send(post(URL), customer, blank)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='label')]").exists())
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='address')]").exists());

        send(post(URL), customer, body("x".repeat(41)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("label"));

        Map<String, Object> noCoordinates = body("Casa");
        noCoordinates.remove("latitude");
        send(post(URL), customer, noCoordinates)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("latitude"));

        Map<String, Object> outOfRange = body("Casa");
        outOfRange.put("longitude", 181);
        send(post(URL), customer, outOfRange)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("longitude"));
    }

    @Test
    void updatesAnAddress() throws Exception {
        Customer customer = register();
        long id = create(customer, "Casa");

        Map<String, Object> changes = body("Oficina");
        changes.put("reference", null);
        changes.put("latitude", -12.1);
        send(put(URL + "/" + id), customer, changes)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Oficina"))
                .andExpect(jsonPath("$.reference").doesNotExist())
                .andExpect(jsonPath("$.latitude").value(-12.1));
    }

    @Test
    void deleteIsSoftAndHidesTheAddress() throws Exception {
        Customer customer = register();
        long id = create(customer, "Casa");

        mockMvc.perform(delete(URL + "/" + id).cookie(customer.access())).andExpect(status().isNoContent());

        mockMvc.perform(get(URL).cookie(customer.access())).andExpect(jsonPath("$.length()").value(0));
        Long deleted = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM addresses WHERE id = ? AND deleted_at IS NOT NULL", Long.class, id);
        assertThat(deleted).isEqualTo(1L);

        send(put(URL + "/" + id), customer, body("Casa")).andExpect(status().isNotFound());
        mockMvc.perform(delete(URL + "/" + id).cookie(customer.access())).andExpect(status().isNotFound());
    }

    @Test
    void anotherCustomersAddressIsNotFound() throws Exception {
        Customer owner = register();
        Customer other = register();
        long id = create(owner, "Casa");

        send(put(URL + "/" + id), other, body("Mía")).andExpect(status().isNotFound());
        mockMvc.perform(delete(URL + "/" + id).cookie(other.access())).andExpect(status().isNotFound());
        mockMvc.perform(get(URL).cookie(owner.access())).andExpect(jsonPath("$[0].label").value("Casa"));
        mockMvc.perform(get(URL).cookie(other.access())).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void theEleventhActiveAddressIsRejectedUntilOneIsDeleted() throws Exception {
        Customer customer = register();
        long first = create(customer, "Dirección 1");
        for (int i = 2; i <= 10; i++) {
            create(customer, "Dirección " + i);
        }

        send(post(URL), customer, body("Dirección 11")).andExpect(status().isConflict());

        mockMvc.perform(delete(URL + "/" + first).cookie(customer.access())).andExpect(status().isNoContent());
        create(customer, "Dirección 11");
    }
}
