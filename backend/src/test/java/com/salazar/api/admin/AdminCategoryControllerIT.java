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
class AdminCategoryControllerIT {
    private static final String URL = "/api/admin/categories";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // The database is shared with the other integration tests, which expect only the seeded categories
    @AfterEach
    void removeCreatedCategories() {
        String seeded = "('entradas', 'ceviches', 'chicharrones', 'fondos', 'bebidas')";
        jdbcTemplate.update(
                "DELETE FROM products WHERE category_id IN (SELECT id FROM categories WHERE slug NOT IN " + seeded + ")");
        jdbcTemplate.update("DELETE FROM categories WHERE slug NOT IN " + seeded);
    }

    private Cookie register(boolean administrator) throws Exception {
        String email = "categorias-" + UUID.randomUUID() + "@correo.com";
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

    private Map<String, String> body(String name, String slug) {
        return Map.of("name", name, "slug", slug);
    }

    private String unique() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private long create(Cookie admin, String name, String slug) throws Exception {
        MvcResult result = send(post(URL), admin, body(name, slug)).andExpect(status().isCreated()).andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private void insertProduct(long categoryId, boolean active) {
        jdbcTemplate.update(
                "INSERT INTO products (name, description, price, category_id, is_active, stock) VALUES (?, 'd', 10, ?, ?, 5)",
                "Plato " + unique(),
                categoryId,
                active);
    }

    @Test
    void withoutSessionItIsUnauthorizedAndACustomerIsForbidden() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body("A", "a"))))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete(URL + "/1")).andExpect(status().isUnauthorized());

        Cookie customer = register(false);
        mockMvc.perform(get(URL).cookie(customer)).andExpect(status().isForbidden());
        send(post(URL), customer, body("A", "a")).andExpect(status().isForbidden());
        send(put(URL + "/1"), customer, body("A", "a")).andExpect(status().isForbidden());
        mockMvc.perform(delete(URL + "/1").cookie(customer)).andExpect(status().isForbidden());
    }

    @Test
    void createsACategoryThatAlsoShowsInThePublicList() throws Exception {
        Cookie admin = register(true);
        String suffix = unique();

        send(post(URL), admin, body(" Postres " + suffix + " ", " Postres-" + suffix))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Postres " + suffix))
                .andExpect(jsonPath("$.slug").value("postres-" + suffix))
                .andExpect(jsonPath("$.productCount").value(0));

        mockMvc.perform(get("/api/categories"))
                .andExpect(jsonPath("$[?(@.slug == 'postres-" + suffix + "')]").isNotEmpty());
    }

    @Test
    void rejectsInvalidFields() throws Exception {
        Cookie admin = register(true);

        send(post(URL), admin, body("", "ok")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
        send(post(URL), admin, body("Ok", "")).andExpect(status().isBadRequest());
        send(post(URL), admin, body("Ok", "con espacios")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("slug"));
        send(post(URL), admin, body("Ok", "con--guiones")).andExpect(status().isBadRequest());
        send(post(URL), admin, body("Ok", "-inicio")).andExpect(status().isBadRequest());
        send(post(URL), admin, body("Ok", "tilde-ñ")).andExpect(status().isBadRequest());
        send(post(URL), admin, body("x".repeat(81), "ok")).andExpect(status().isBadRequest());
        send(post(URL), admin, body("Ok", "x".repeat(81))).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsARepeatedNameIgnoringCaseOrARepeatedSlug() throws Exception {
        Cookie admin = register(true);
        String suffix = unique();
        create(admin, "Sopas " + suffix, "sopas-" + suffix);

        send(post(URL), admin, body("SOPAS " + suffix, "otra-" + suffix))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
        send(post(URL), admin, body("Otra " + suffix, "sopas-" + suffix))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("slug"));
    }

    @Test
    void updatesNameAndSlugAndKeepingYourOwnValuesIsNotAConflict() throws Exception {
        Cookie admin = register(true);
        String suffix = unique();
        long id = create(admin, "Guisos " + suffix, "guisos-" + suffix);

        send(put(URL + "/" + id), admin, body("Guisos " + suffix, "guisos-nuevo-" + suffix))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Guisos " + suffix))
                .andExpect(jsonPath("$.slug").value("guisos-nuevo-" + suffix));
        send(put(URL + "/" + id), admin, body("Guisos Caseros " + suffix, "guisos-nuevo-" + suffix))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("guisos-nuevo-" + suffix));

        String taken = jdbcTemplate.queryForObject("SELECT slug FROM categories WHERE slug = 'ceviches'", String.class);
        send(put(URL + "/" + id), admin, body("Guisos Caseros " + suffix, taken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("slug"));
    }

    @Test
    void deletesAnEmptyCategoryButNotOneWithProducts() throws Exception {
        Cookie admin = register(true);
        String suffix = unique();
        long empty = create(admin, "Vacía " + suffix, "vacia-" + suffix);
        long used = create(admin, "Usada " + suffix, "usada-" + suffix);
        insertProduct(used, false);

        mockMvc.perform(delete(URL + "/" + empty).cookie(admin)).andExpect(status().isNoContent());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM categories WHERE id = ?", Long.class, empty))
                .isZero();

        mockMvc.perform(delete(URL + "/" + used).cookie(admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("No se puede eliminar: tiene platos asociados."));
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM categories WHERE id = ?", Long.class, used))
                .isEqualTo(1);
    }

    @Test
    void missingCategoriesAreNotFound() throws Exception {
        Cookie admin = register(true);

        send(put(URL + "/999999"), admin, body("A", "a")).andExpect(status().isNotFound());
        mockMvc.perform(delete(URL + "/999999").cookie(admin)).andExpect(status().isNotFound());
    }

    @Test
    void listsTwentyPerPageSortedByNameWithProductCounts() throws Exception {
        Cookie admin = register(true);
        String suffix = unique();
        long first = create(admin, "aaa-" + suffix, "aaa-" + suffix);
        insertProduct(first, true);
        insertProduct(first, false);
        for (int i = 0; i < 22; i++) {
            create(admin, "Lote " + suffix + " " + String.format("%02d", i), "lote-" + suffix + "-" + i);
        }

        MvcResult result = mockMvc.perform(get(URL).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(20))
                .andExpect(jsonPath("$.pageSize").value(20))
                .andReturn();
        JsonNode page = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(page.get("totalPages").asInt()).isGreaterThanOrEqualTo(2);
        long total = page.get("totalItems").asLong();
        assertThat(total).isEqualTo(jdbcTemplate.queryForObject("SELECT count(*) FROM categories", Long.class));

        JsonNode aaa = null;
        for (JsonNode item : page.get("items")) {
            if (item.get("id").asLong() == first) aaa = item;
        }
        assertThat(aaa).isNotNull();
        assertThat(aaa.get("productCount").asLong()).isEqualTo(2);

        String previous = "";
        for (JsonNode item : page.get("items")) {
            String name = item.get("name").asText().toLowerCase();
            assertThat(name.compareTo(previous)).isGreaterThanOrEqualTo(0);
            previous = name;
        }
    }

    @Test
    void anOutOfRangePageReturnsTheLastOne() throws Exception {
        Cookie admin = register(true);

        MvcResult result = mockMvc.perform(get(URL).param("page", "9999").cookie(admin))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode page = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(page.get("page").asInt()).isEqualTo(page.get("totalPages").asInt());
        assertThat(page.get("items").size()).isGreaterThan(0);
        mockMvc.perform(get(URL).param("page", "0").cookie(admin)).andExpect(jsonPath("$.page").value(1));
    }

    @Test
    void searchesByNameOrSlugIgnoringCaseAndTreatingWildcardsAsText() throws Exception {
        Cookie admin = register(true);
        String suffix = unique();
        create(admin, "Zumos Naturales " + suffix, "bebidas-frescas-" + suffix);
        create(admin, "Otra " + suffix, "otra-" + suffix);

        mockMvc.perform(get(URL).param("q", "ZUMOS naturales " + suffix).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Zumos Naturales " + suffix));
        mockMvc.perform(get(URL).param("q", "BEBIDAS-FRESCAS-" + suffix.toUpperCase()).cookie(admin))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].slug").value("bebidas-frescas-" + suffix));
        mockMvc.perform(get(URL).param("q", suffix).cookie(admin)).andExpect(jsonPath("$.totalItems").value(2));
        mockMvc.perform(get(URL).param("q", "%").cookie(admin)).andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(get(URL).param("q", "_").cookie(admin)).andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(get(URL).param("q", "no-existe-" + suffix).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void aBlankSearchListsEverything() throws Exception {
        Cookie admin = register(true);
        long total = jdbcTemplate.queryForObject("SELECT count(*) FROM categories", Long.class);

        mockMvc.perform(get(URL).param("q", "   ").cookie(admin)).andExpect(jsonPath("$.totalItems").value(total));
    }
}
