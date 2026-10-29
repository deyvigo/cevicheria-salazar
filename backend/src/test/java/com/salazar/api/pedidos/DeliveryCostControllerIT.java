package com.salazar.api.pedidos;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.dto.RegisterRequest;
import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class DeliveryCostControllerIT {
    private static final String URL = "/api/pedidos/costo-delivery";
    private static final String SQUARE = "ST_GeomFromText('POLYGON((-77.04 -12.04, -77.02 -12.04, -77.02 -12.06, -77.04 -12.06, -77.04 -12.04))', 4326)";

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

    @AfterEach
    void clean() {
        jdbcTemplate.update("DELETE FROM delivery_zones");
    }

    private void zone(String price, boolean active) {
        jdbcTemplate.update(
                "INSERT INTO delivery_zones (name, price, color, area, active) VALUES ('Centro', " + price
                        + ", 'lima', " + SQUARE + ", ?)",
                active);
    }

    private long address(Customer customer, double latitude, double longitude) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("label", "Casa");
        body.put("address", "Av. Arequipa 123, Lince");
        body.put("reference", null);
        body.put("latitude", latitude);
        body.put("longitude", longitude);
        MvcResult result = mockMvc.perform(post("/api/perfil/direcciones")
                        .cookie(customer.access())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void withoutSessionItIsUnauthorized() throws Exception {
        mockMvc.perform(get(URL).param("direccionId", "1")).andExpect(status().isUnauthorized());
    }

    @Test
    void anAdministratorIsForbidden() throws Exception {
        Customer admin = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", admin.email());

        mockMvc.perform(get(URL).param("direccionId", "1").cookie(admin.access()))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAddressInsideAZoneReturnsItsPriceAndFollowsTariffChanges() throws Exception {
        zone("8.50", true);
        Customer customer = register();
        long id = address(customer, -12.05, -77.03);

        mockMvc.perform(get(URL).param("direccionId", String.valueOf(id)).cookie(customer.access()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.covered").value(true))
                .andExpect(jsonPath("$.price").value(8.5))
                .andExpect(jsonPath("$.zone").value("Centro"));

        jdbcTemplate.update("UPDATE delivery_zones SET price = 10");

        mockMvc.perform(get(URL).param("direccionId", String.valueOf(id)).cookie(customer.access()))
                .andExpect(jsonPath("$.price").value(10.0));
    }

    @Test
    void anAddressOutsideEveryActiveZoneIsNotCovered() throws Exception {
        zone("8.50", true);
        Customer customer = register();
        long outside = address(customer, -12.10, -77.00);

        mockMvc.perform(get(URL).param("direccionId", String.valueOf(outside)).cookie(customer.access()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.covered").value(false))
                .andExpect(jsonPath("$.price").value(0.0))
                .andExpect(jsonPath("$.zone").doesNotExist());

        jdbcTemplate.update("UPDATE delivery_zones SET active = false");
        long inside = address(customer, -12.05, -77.03);

        mockMvc.perform(get(URL).param("direccionId", String.valueOf(inside)).cookie(customer.access()))
                .andExpect(jsonPath("$.covered").value(false));
    }

    @Test
    void anotherCustomersDeletedOrMissingAddressIsNotFound() throws Exception {
        zone("8.50", true);
        Customer owner = register();
        Customer other = register();
        long id = address(owner, -12.05, -77.03);

        mockMvc.perform(get(URL).param("direccionId", String.valueOf(id)).cookie(other.access()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(URL).param("direccionId", "999999").cookie(owner.access()))
                .andExpect(status().isNotFound());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/perfil/direcciones/" + id)
                        .cookie(owner.access()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get(URL).param("direccionId", String.valueOf(id)).cookie(owner.access()))
                .andExpect(status().isNotFound());
    }

    @Test
    void aMissingOrNonNumericAddressIdIsABadRequest() throws Exception {
        Customer customer = register();

        mockMvc.perform(get(URL).cookie(customer.access())).andExpect(status().isBadRequest());
        mockMvc.perform(get(URL).param("direccionId", "abc").cookie(customer.access()))
                .andExpect(status().isBadRequest());
    }
}
