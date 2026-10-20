package com.salazar.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.dto.RegisterRequest;
import com.salazar.api.catalogo.ImageStorage;
import com.salazar.api.catalogo.ImageType;
import jakarta.servlet.http.Cookie;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class AdminProductControllerIT {
    private static final String URL = "/api/admin/products";
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3};

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private ImageStorage imageStorage;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void cleanProducts() {
        jdbcTemplate.update("DELETE FROM products");
        when(imageStorage.upload(any(), any(ImageType.class)))
                .thenAnswer(invocation -> "products/" + UUID.randomUUID() + ".jpg");
    }

    // The database is shared with the other integration tests
    @AfterEach
    void removeProducts() {
        jdbcTemplate.update("DELETE FROM products");
        jdbcTemplate.update("DELETE FROM categories WHERE slug NOT IN ('entradas', 'ceviches', 'chicharrones', 'fondos', 'bebidas')");
    }

    private Cookie register(boolean administrator) throws Exception {
        String email = "platos-" + UUID.randomUUID() + "@correo.com";
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

    private long categoryId(String slug) {
        return jdbcTemplate.queryForObject("SELECT id FROM categories WHERE slug = ?", Long.class, slug);
    }

    private Map<String, Object> data(String name, Object... images) {
        return new java.util.HashMap<>(Map.of(
                "name", name,
                "description", "Fresco del día",
                "price", "32.00",
                "categoryId", categoryId("ceviches"),
                "stock", 10,
                "active", true,
                "available", true,
                "images", List.of(images)));
    }

    private static Map<String, Object> file(int index) {
        return Map.of("file", index);
    }

    private static Map<String, Object> kept(long id) {
        return Map.of("id", id);
    }

    private ResultActions send(HttpMethod method, String url, Cookie cookie, Map<String, Object> data, byte[]... files)
            throws Exception {
        MockMultipartHttpServletRequestBuilder builder = multipart(method, url);
        builder.file(new MockMultipartFile(
                "data", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(data)));
        for (byte[] content : files) {
            builder.file(new MockMultipartFile("files", "foto.jpg", "image/jpeg", content));
        }
        return mockMvc.perform(builder.cookie(cookie));
    }

    private JsonNode create(Cookie admin, String name, int images) throws Exception {
        List<Object> entries = new ArrayList<>();
        byte[][] files = new byte[images][];
        for (int i = 0; i < images; i++) {
            entries.add(file(i));
            files[i] = JPEG;
        }
        MvcResult result = send(HttpMethod.POST, URL, admin, data(name, entries.toArray()), files)
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private List<Long> imageIds(JsonNode product) {
        List<Long> ids = new ArrayList<>();
        product.get("images").forEach(image -> ids.add(image.get("id").asLong()));
        return ids;
    }

    @Test
    void withoutSessionItIsUnauthorizedAndACustomerIsForbidden() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(URL + "/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(multipart(HttpMethod.POST, URL).file(new MockMultipartFile("data", "", "application/json", "{}".getBytes())))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete(URL + "/1")).andExpect(status().isUnauthorized());

        Cookie customer = register(false);
        mockMvc.perform(get(URL).cookie(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get(URL + "/1").cookie(customer)).andExpect(status().isForbidden());
        send(HttpMethod.POST, URL, customer, data("A", file(0)), JPEG).andExpect(status().isForbidden());
        send(HttpMethod.PUT, URL + "/1", customer, data("A", file(0)), JPEG).andExpect(status().isForbidden());
        mockMvc.perform(delete(URL + "/1").cookie(customer)).andExpect(status().isForbidden());
    }

    @Test
    void createsADishWhoseFirstImageIsThePrincipalOneInTheStore() throws Exception {
        Cookie admin = register(true);

        JsonNode created = create(admin, "  Ceviche mixto ", 2);

        assertThat(created.get("name").asText()).isEqualTo("Ceviche mixto");
        assertThat(created.get("images")).hasSize(2);
        String principal = created.get("images").get(0).get("url").asText();
        mockMvc.perform(get("/api/products").param("category", "ceviches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Ceviche mixto"))
                .andExpect(jsonPath("$.items[0].imageUrl").value(principal));
        mockMvc.perform(get("/api/products/" + created.get("id").asLong()))
                .andExpect(jsonPath("$.images.length()").value(2))
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void editingReordersRemovesAndAddsImages() throws Exception {
        Cookie admin = register(true);
        JsonNode created = create(admin, "Ceviche", 3);
        List<Long> ids = imageIds(created);
        String removedPath = jdbcTemplate.queryForObject(
                "SELECT path FROM product_images WHERE id = ?", String.class, ids.get(1));
        long productId = created.get("id").asLong();

        Map<String, Object> edit = data("Ceviche clásico", file(0), kept(ids.get(2)), kept(ids.get(0)));
        edit.put("price", "35.50");
        edit.put("stock", 3);
        edit.put("active", false);
        edit.put("available", false);
        send(HttpMethod.PUT, URL + "/" + productId, admin, edit, JPEG)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ceviche clásico"))
                .andExpect(jsonPath("$.price").value(35.5))
                .andExpect(jsonPath("$.images.length()").value(3))
                .andExpect(jsonPath("$.images[1].id").value(ids.get(2)))
                .andExpect(jsonPath("$.images[2].id").value(ids.get(0)));

        assertThat(jdbcTemplate.queryForList("SELECT id FROM product_images WHERE product_id = ? ORDER BY position", Long.class, productId))
                .hasSize(3)
                .endsWith(ids.get(2), ids.get(0))
                .doesNotContain(ids.get(1));
        verify(imageStorage).deleteQuietly(removedPath);
        mockMvc.perform(get("/api/products/" + productId)).andExpect(status().isNotFound());
        mockMvc.perform(get(URL + "/" + productId).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void anUnavailableDishStaysVisibleInTheStore() throws Exception {
        Cookie admin = register(true);
        long id = create(admin, "Ceviche", 1).get("id").asLong();
        Map<String, Object> edit = data("Ceviche", kept(imageIds(objectMapper.readTree(
                mockMvc.perform(get(URL + "/" + id).cookie(admin)).andReturn().getResponse().getContentAsString())).get(0)));
        edit.put("available", false);

        send(HttpMethod.PUT, URL + "/" + id, admin, edit).andExpect(status().isOk());

        mockMvc.perform(get("/api/products/" + id)).andExpect(status().isOk()).andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void rejectsInvalidFields() throws Exception {
        Cookie admin = register(true);
        Map<String, Object> blank = data("   ", file(0));
        send(HttpMethod.POST, URL, admin, blank, JPEG).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
        for (String price : List.of("-1", "10000", "1.234")) {
            Map<String, Object> body = data("Ok", file(0));
            body.put("price", price);
            send(HttpMethod.POST, URL, admin, body, JPEG).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors[0].field").value("price"));
        }
        Map<String, Object> stock = data("Ok", file(0));
        stock.put("stock", -1);
        send(HttpMethod.POST, URL, admin, stock, JPEG).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("stock"));
        Map<String, Object> noCategory = data("Ok", file(0));
        noCategory.put("categoryId", 999_999);
        send(HttpMethod.POST, URL, admin, noCategory, JPEG).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("categoryId"));
        send(HttpMethod.POST, URL, admin, data("Ok")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("images"));
        Object[] six = {file(0), file(1), file(2), file(3), file(4), file(5)};
        send(HttpMethod.POST, URL, admin, data("Ok", six), JPEG, JPEG, JPEG, JPEG, JPEG, JPEG)
                .andExpect(status().isBadRequest());
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM products", Long.class)).isZero();
    }

    @Test
    void rejectsAFileThatIsNotAnImageAndSavesNothing() throws Exception {
        Cookie admin = register(true);

        send(HttpMethod.POST, URL, admin, data("Ok", file(0)), "<html></html>".getBytes())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("images"));
        mockMvc.perform(multipart(HttpMethod.POST, URL).cookie(admin)).andExpect(status().isBadRequest());

        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM products", Long.class)).isZero();
    }

    @Test
    void listsActiveAndInactiveDishesByNameIgnoringAccentsAndSkippingDeletedOnes() throws Exception {
        Cookie admin = register(true);
        create(admin, "Zarza", 1);
        create(admin, "Ají de gallina", 1);
        long hidden = create(admin, "Ají oculto", 1).get("id").asLong();
        jdbcTemplate.update("UPDATE products SET is_active = false WHERE id = ?", hidden);
        long deleted = create(admin, "Ají borrado", 1).get("id").asLong();
        mockMvc.perform(delete(URL + "/" + deleted).cookie(admin)).andExpect(status().isNoContent());

        mockMvc.perform(get(URL).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.items[0].name").value("Ají de gallina"))
                .andExpect(jsonPath("$.items[1].name").value("Ají oculto"))
                .andExpect(jsonPath("$.items[2].name").value("Zarza"));
        mockMvc.perform(get(URL).param("q", "AJI").cookie(admin)).andExpect(jsonPath("$.totalItems").value(2));
        mockMvc.perform(get(URL).param("q", "%").cookie(admin)).andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(get(URL).param("q", "no existe").cookie(admin))
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.totalPages").value(0));
    }

    private void insert(String name, String category, String price, String rating, int stock) {
        jdbcTemplate.update(
                "INSERT INTO products (name, description, price, category_id, rating, stock) VALUES (?, 'd', ?::numeric, ?, ?::numeric, ?)",
                name,
                price,
                categoryId(category),
                rating,
                stock);
    }

    private List<String> names(Cookie admin, String sort, String dir) throws Exception {
        MvcResult result = mockMvc.perform(get(URL).param("sort", sort).param("dir", dir).cookie(admin))
                .andExpect(status().isOk())
                .andReturn();
        List<String> names = new ArrayList<>();
        objectMapper.readTree(result.getResponse().getContentAsString()).get("items")
                .forEach(item -> names.add(item.get("name").asText()));
        return names;
    }

    @Test
    void sortsByNameCategoryPriceRatingAndStockInBothDirections() throws Exception {
        Cookie admin = register(true);
        insert("Beta", "fondos", "20.00", "4.0", 5);
        insert("alfa", "ceviches", "30.00", null, 9);
        insert("Gamma", "bebidas", "10.00", "5.0", 1);

        assertThat(names(admin, "name", "asc")).containsExactly("alfa", "Beta", "Gamma");
        assertThat(names(admin, "name", "desc")).containsExactly("Gamma", "Beta", "alfa");
        assertThat(names(admin, "category", "asc")).containsExactly("Gamma", "alfa", "Beta");
        assertThat(names(admin, "category", "desc")).containsExactly("Beta", "alfa", "Gamma");
        assertThat(names(admin, "price", "asc")).containsExactly("Gamma", "Beta", "alfa");
        assertThat(names(admin, "price", "desc")).containsExactly("alfa", "Beta", "Gamma");
        assertThat(names(admin, "stock", "asc")).containsExactly("Gamma", "Beta", "alfa");
        assertThat(names(admin, "stock", "desc")).containsExactly("alfa", "Beta", "Gamma");
        // Unrated dishes go last in both directions
        assertThat(names(admin, "rating", "asc")).containsExactly("Beta", "Gamma", "alfa");
        assertThat(names(admin, "rating", "desc")).containsExactly("Gamma", "Beta", "alfa");
        // Unknown values fall back to name ascending
        assertThat(names(admin, "nope", "sideways")).containsExactly("alfa", "Beta", "Gamma");
    }

    @Test
    void paginatesFifteenAtATimeAndFallsBackToTheLastPage() throws Exception {
        Cookie admin = register(true);
        for (int i = 1; i <= 16; i++) {
            jdbcTemplate.update(
                    "INSERT INTO products (name, description, price, category_id, stock) VALUES (?, 'd', 10, ?, 5)",
                    "Plato %02d".formatted(i),
                    categoryId("fondos"));
        }

        mockMvc.perform(get(URL).cookie(admin))
                .andExpect(jsonPath("$.items.length()").value(15))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.items[0].name").value("Plato 01"));
        mockMvc.perform(get(URL).param("page", "2").cookie(admin)).andExpect(jsonPath("$.items.length()").value(1));
        mockMvc.perform(get(URL).param("page", "9").cookie(admin))
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.items.length()").value(1));
    }

    @Test
    void deletingIsSoftAndTheDishDisappearsFromEverywhere() throws Exception {
        Cookie admin = register(true);
        JsonNode created = create(admin, "Ceviche mixto", 1);
        long id = created.get("id").asLong();

        mockMvc.perform(delete(URL + "/" + id).cookie(admin)).andExpect(status().isNoContent());

        assertThat(jdbcTemplate.queryForObject("SELECT deleted_at FROM products WHERE id = ?", Object.class, id)).isNotNull();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM product_images WHERE product_id = ?", Long.class, id))
                .isEqualTo(1);
        mockMvc.perform(get("/api/products/" + id)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/products").param("category", "ceviches")).andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(get("/api/products").param("q", "ceviche")).andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(get("/api/products").param("ids", String.valueOf(id))).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/categories").param("q", "ceviche")).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get(URL).cookie(admin)).andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(get(URL + "/" + id).cookie(admin)).andExpect(status().isNotFound());
        mockMvc.perform(delete(URL + "/" + id).cookie(admin)).andExpect(status().isNotFound());
        send(HttpMethod.PUT, URL + "/" + id, admin, data("X", kept(imageIds(created).get(0)))).andExpect(status().isNotFound());
    }

    @Test
    void anyDishCanBeDeletedWhateverItsState() throws Exception {
        Cookie admin = register(true);
        long id = create(admin, "Ceviche", 1).get("id").asLong();
        jdbcTemplate.update("UPDATE products SET is_active = false, is_available = false, stock = 0 WHERE id = ?", id);

        mockMvc.perform(delete(URL + "/" + id).cookie(admin)).andExpect(status().isNoContent());
    }

    @Test
    void aCategoryWhoseOnlyDishIsDeletedStillCountsItAndCannotBeDeleted() throws Exception {
        Cookie admin = register(true);
        String slug = "postres-" + UUID.randomUUID().toString().substring(0, 8);
        jdbcTemplate.update("INSERT INTO categories (name, slug) VALUES (?, ?)", slug, slug);
        long category = categoryId(slug);
        Map<String, Object> body = data("Torta", file(0));
        body.put("categoryId", category);
        long id = objectMapper
                .readTree(send(HttpMethod.POST, URL, admin, body, JPEG).andReturn().getResponse().getContentAsString())
                .get("id")
                .asLong();
        mockMvc.perform(delete(URL + "/" + id).cookie(admin)).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/categories").param("q", slug).cookie(admin))
                .andExpect(jsonPath("$.items[0].productCount").value(1));
        mockMvc.perform(delete("/api/admin/categories/" + category).cookie(admin)).andExpect(status().isConflict());
    }
}
