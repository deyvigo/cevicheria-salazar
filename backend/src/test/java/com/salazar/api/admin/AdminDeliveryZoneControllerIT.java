package com.salazar.api.admin;

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
import java.util.List;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class AdminDeliveryZoneControllerIT {
    private static final String URL = "/api/admin/delivery-zones";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @AfterEach
    void removeZones() {
        jdbcTemplate.update("DELETE FROM delivery_zones");
    }

    private Cookie register(boolean administrator) throws Exception {
        String email = "zonas-" + UUID.randomUUID() + "@correo.com";
        String phone = "9" + String.format("%08d", Math.abs(UUID.randomUUID().getLeastSignificantBits()) % 100_000_000);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(email, "clave1234", "Ana", "Torres", phone))))
                .andExpect(status().isCreated())
                .andReturn();
        if (administrator) {
            jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", email);
        }
        return result.getResponse().getCookie("access_token");
    }

    private ResultActions send(MockHttpServletRequestBuilder builder, Cookie cookie, Object content) throws Exception {
        return mockMvc.perform(builder.cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(content)));
    }

    private static Map<String, Object> point(double latitude, double longitude) {
        return Map.of("latitude", latitude, "longitude", longitude);
    }

    private static List<Map<String, Object>> square(double latitude, double longitude, double size) {
        return List.of(
                point(latitude, longitude),
                point(latitude, longitude + size),
                point(latitude - size, longitude + size),
                point(latitude - size, longitude));
    }

    private static Map<String, Object> body(String name, Object price, List<Map<String, Object>> coordinates) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("price", price);
        body.put("color", "celeste");
        body.put("active", true);
        body.put("coordinates", coordinates);
        return body;
    }

    private static Map<String, Object> body(String name) {
        return body(name, 8.5, square(-12.04, -77.04, 0.02));
    }

    private long create(Cookie admin, Map<String, Object> body) throws Exception {
        MvcResult result = send(post(URL), admin, body).andExpect(status().isCreated()).andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    @Test
    void createsAZoneAndReturnsItsCoordinates() throws Exception {
        Cookie admin = register(true);

        send(post(URL), admin, body("Miraflores"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Miraflores"))
                .andExpect(jsonPath("$.price").value(8.5))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.coordinates.length()").value(4))
                .andExpect(jsonPath("$.coordinates[0].latitude").value(-12.04))
                .andExpect(jsonPath("$.coordinates[0].longitude").value(-77.04));
    }

    @Test
    void listsEveryZoneByNameIncludingInactiveOnes() throws Exception {
        Cookie admin = register(true);
        create(admin, body("barranco"));
        Map<String, Object> inactive = body("Ate", 6, square(-12.1, -77.0, 0.02));
        inactive.put("active", false);
        create(admin, inactive);

        mockMvc.perform(get(URL).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Ate"))
                .andExpect(jsonPath("$[0].active").value(false))
                .andExpect(jsonPath("$[1].name").value("barranco"));
    }

    @Test
    void rejectsInvalidPricesColorsAndAreas() throws Exception {
        Cookie admin = register(true);

        for (Object price : List.of(0, -1, 100, 8.999)) {
            send(post(URL), admin, body("Zona", price, square(-12.04, -77.04, 0.02))).andExpect(status().isBadRequest());
        }
        Map<String, Object> badColor = body("Zona");
        badColor.put("color", "rojo");
        send(post(URL), admin, badColor).andExpect(status().isBadRequest());
        send(post(URL), admin, body("Zona", 5, square(-12.04, -77.04, 0.02).subList(0, 2)))
                .andExpect(status().isBadRequest());
        List<Map<String, Object>> bowtie = List.of(
                point(-12.04, -77.04), point(-12.06, -77.02), point(-12.04, -77.02), point(-12.06, -77.04));
        send(post(URL), admin, body("Zona", 5, bowtie))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("coordinates"));
        send(post(URL), admin, body("Zona", 5, List.of(point(95, -77), point(-12, -77.1), point(-12.1, -77.2))))
                .andExpect(status().isBadRequest());
        send(post(URL), admin, body(" ")).andExpect(status().isBadRequest());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM delivery_zones", Integer.class)).isZero();
    }

    @Test
    void rejectsARepeatedNameIgnoringCase() throws Exception {
        Cookie admin = register(true);
        create(admin, body("Miraflores"));

        send(post(URL), admin, body("MIRAFLORES"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
    }

    @Test
    void acceptsOverlappingZones() throws Exception {
        Cookie admin = register(true);
        create(admin, body("Grande", 5, square(-12.04, -77.04, 0.04)));
        create(admin, body("Pequena", 9, square(-12.05, -77.03, 0.01)));

        mockMvc.perform(get(URL).cookie(admin)).andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void updatesEveryField() throws Exception {
        Cookie admin = register(true);
        long id = create(admin, body("Miraflores"));
        Map<String, Object> changed = body("Miraflores centro", 12, square(-12.1, -77.1, 0.03));
        changed.put("color", "coral");
        changed.put("active", false);

        send(put(URL + "/" + id), admin, changed)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Miraflores centro"))
                .andExpect(jsonPath("$.price").value(12))
                .andExpect(jsonPath("$.color").value("coral"))
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.coordinates[0].latitude").value(-12.1));
        send(put(URL + "/" + id), admin, changed).andExpect(status().isOk());
    }

    @Test
    void updateCanKeepItsOwnNameButNotTakeAnotherOne() throws Exception {
        Cookie admin = register(true);
        long id = create(admin, body("Miraflores"));
        create(admin, body("Barranco", 5, square(-12.2, -77.0, 0.02)));

        send(put(URL + "/" + id), admin, body("Miraflores")).andExpect(status().isOk());
        send(put(URL + "/" + id), admin, body("barranco"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
    }

    @Test
    void updateAndDeleteOfAMissingZoneAreNotFound() throws Exception {
        Cookie admin = register(true);

        send(put(URL + "/999999"), admin, body("Zona")).andExpect(status().isNotFound());
        mockMvc.perform(delete(URL + "/999999").cookie(admin)).andExpect(status().isNotFound());
    }

    @Test
    void deletesAZone() throws Exception {
        Cookie admin = register(true);
        long id = create(admin, body("Miraflores"));

        mockMvc.perform(delete(URL + "/" + id).cookie(admin)).andExpect(status().isNoContent());
        mockMvc.perform(get(URL).cookie(admin)).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void requiresAnAdministrator() throws Exception {
        Cookie customer = register(false);
        Cookie admin = register(true);
        long id = create(admin, body("Miraflores"));

        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete(URL + "/" + id)).andExpect(status().isUnauthorized());

        mockMvc.perform(get(URL).cookie(customer)).andExpect(status().isForbidden());
        send(post(URL), customer, body("Otra")).andExpect(status().isForbidden());
        send(put(URL + "/" + id), customer, body("Otra")).andExpect(status().isForbidden());
        mockMvc.perform(delete(URL + "/" + id).cookie(customer)).andExpect(status().isForbidden());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM delivery_zones", Integer.class)).isEqualTo(1);
    }
}
