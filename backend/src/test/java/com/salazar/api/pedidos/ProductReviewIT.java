package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class ProductReviewIT extends OrderITSupport {
    @AfterEach
    void cleanReviews() {
        jdbcTemplate.update("DELETE FROM product_reviews");
    }

    private long dish() {
        return product("Ceviche " + UUID.randomUUID(), "30.00", 50);
    }

    private void order(Customer customer, long dish, String deliveryStatus) throws Exception {
        long id = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}));
        jdbcTemplate.update(
                "UPDATE orders SET status = 'PAGADO', paid_at = now(), delivery_status = ? WHERE id = ?",
                deliveryStatus,
                id);
    }

    private String url(long dish, String suffix) {
        return "/api/products/" + dish + "/reviews" + suffix;
    }

    private MvcResult save(Customer customer, long dish, String body, int expected) throws Exception {
        return mockMvc.perform(put(url(dish, "/mine"))
                        .cookie(customer.access())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is(expected))
                .andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode list(long dish, String page) throws Exception {
        return json(mockMvc.perform(get(url(dish, page == null ? "" : "?page=" + page)))
                .andExpect(status().isOk())
                .andReturn());
    }

    private JsonNode detail(long dish) throws Exception {
        return json(mockMvc.perform(get("/api/products/" + dish)).andExpect(status().isOk()).andReturn());
    }

    private JsonNode mine(Customer customer, long dish) throws Exception {
        return json(mockMvc.perform(get(url(dish, "/mine")).cookie(customer.access()))
                .andExpect(status().isOk())
                .andReturn());
    }

    @Test
    void anyoneCanReadTheReviewsOfAnActiveDish() throws Exception {
        long dish = dish();

        JsonNode page = list(dish, null);

        assertThat(page.get("items")).isEmpty();
        assertThat(page.get("totalItems").asInt()).isZero();
        mockMvc.perform(get(url(999_999_999L, ""))).andExpect(status().isNotFound());
        jdbcTemplate.update("UPDATE products SET is_active = false WHERE id = ?", dish);
        mockMvc.perform(get(url(dish, ""))).andExpect(status().isNotFound());
    }

    @Test
    void writingRequiresASessionAndACustomer() throws Exception {
        long dish = dish();
        mockMvc.perform(get(url(dish, "/mine"))).andExpect(status().isUnauthorized());
        mockMvc.perform(put(url(dish, "/mine")).contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete(url(dish, "/mine"))).andExpect(status().isUnauthorized());

        Customer admin = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", admin.email());
        mockMvc.perform(get(url(dish, "/mine")).cookie(admin.access())).andExpect(status().isForbidden());
    }

    @Test
    void onlyADeliveredPurchaseAllowsReviewing() throws Exception {
        Customer customer = register();
        long dish = dish();

        assertThat(mine(customer, dish).get("canReview").asBoolean()).isFalse();
        save(customer, dish, "{\"rating\":5}", 403);

        for (String status : new String[] {"PENDIENTE", "EN_PREPARACION", "EN_CAMINO", "CANCELADO", "RECHAZADO", "FALLIDO"}) {
            order(customer, dish, status);
        }
        assertThat(mine(customer, dish).get("canReview").asBoolean()).isFalse();
        save(customer, dish, "{\"rating\":5}", 403);

        order(customer, dish, "ENTREGADO");
        assertThat(mine(customer, dish).get("canReview").asBoolean()).isTrue();
        save(customer, dish, "{\"rating\":5}", 200);
    }

    @Test
    void aDeliveredOrderOfAnotherCustomerDoesNotCount() throws Exception {
        long dish = dish();
        order(register(), dish, "ENTREGADO");

        save(register(), dish, "{\"rating\":4}", 403);
    }

    @Test
    void createsEditsAndDeletesTheReviewAndKeepsTheAverage() throws Exception {
        Customer ana = register();
        Customer luis = register();
        long dish = dish();
        order(ana, dish, "ENTREGADO");
        order(luis, dish, "ENTREGADO");

        JsonNode created = json(save(ana, dish, "{\"rating\":5,\"comment\":\"  Excelente  \"}", 200));
        assertThat(created.get("comment").asText()).isEqualTo("Excelente");
        assertThat(created.get("authorName").asText()).isEqualTo("María");
        assertThat(created.get("edited").asBoolean()).isFalse();
        assertThat(detail(dish).get("rating").decimalValue()).isEqualByComparingTo("5.0");

        save(luis, dish, "{\"rating\":2}", 200);
        JsonNode both = detail(dish);
        assertThat(both.get("rating").decimalValue()).isEqualByComparingTo("3.5");
        assertThat(both.get("reviewCount").asInt()).isEqualTo(2);

        JsonNode edited = json(save(ana, dish, "{\"rating\":3,\"comment\":\"   \"}", 200));
        assertThat(edited.get("comment").isNull()).isTrue();
        assertThat(edited.get("edited").asBoolean()).isTrue();
        assertThat(list(dish, null).get("totalItems").asInt()).isEqualTo(2);
        assertThat(detail(dish).get("rating").decimalValue()).isEqualByComparingTo("2.5");
        assertThat(mine(ana, dish).get("review").get("rating").asInt()).isEqualTo(3);

        mockMvc.perform(delete(url(dish, "/mine")).cookie(ana.access())).andExpect(status().isNoContent());
        mockMvc.perform(delete(url(dish, "/mine")).cookie(luis.access())).andExpect(status().isNoContent());
        JsonNode empty = detail(dish);
        assertThat(empty.get("rating").isNull()).isTrue();
        assertThat(empty.get("reviewCount").asInt()).isZero();
        assertThat(mine(ana, dish).get("review").isNull()).isTrue();
        mockMvc.perform(delete(url(dish, "/mine")).cookie(ana.access())).andExpect(status().isNotFound());
    }

    @Test
    void rejectsAnInvalidRatingOrALongComment() throws Exception {
        Customer customer = register();
        long dish = dish();
        order(customer, dish, "ENTREGADO");

        save(customer, dish, "{}", 400);
        save(customer, dish, "{\"rating\":0}", 400);
        save(customer, dish, "{\"rating\":6}", 400);
        save(customer, dish, "{\"rating\":4,\"comment\":\"" + "a".repeat(501) + "\"}", 400);
        save(customer, dish, "{\"rating\":4,\"comment\":\"" + "a".repeat(500) + "\"}", 200);
    }

    @Test
    void listsTenPerPageNewestFirstWithoutPersonalData() throws Exception {
        long dish = dish();
        for (int i = 1; i <= 12; i++) {
            Customer customer = register();
            order(customer, dish, "ENTREGADO");
            save(customer, dish, "{\"rating\":4,\"comment\":\"c" + i + "\"}", 200);
        }

        JsonNode first = list(dish, null);
        JsonNode second = list(dish, "2");

        assertThat(first.get("items")).hasSize(10);
        assertThat(first.get("totalPages").asInt()).isEqualTo(2);
        assertThat(first.get("items").get(0).get("comment").asText()).isEqualTo("c12");
        assertThat(second.get("items")).hasSize(2);
        assertThat(second.get("items").get(1).get("comment").asText()).isEqualTo("c1");
        assertThat(first.get("items").get(0).has("userId")).isFalse();
        assertThat(first.get("items").get(0).get("authorName").asText()).isEqualTo("María");
    }

    @Test
    void filtersReviewsByRatingBand() throws Exception {
        long dish = dish();
        for (int rating = 1; rating <= 5; rating++) {
            Customer customer = register();
            order(customer, dish, "ENTREGADO");
            save(customer, dish, "{\"rating\":" + rating + "}", 200);
        }

        assertThat(ratings(dish, "positive")).containsExactlyInAnyOrder(4, 5);
        assertThat(ratings(dish, "neutral")).containsExactly(3);
        assertThat(ratings(dish, "negative")).containsExactlyInAnyOrder(1, 2);
        assertThat(ratings(dish, "all")).hasSize(5);
        assertThat(ratings(dish, "unknown")).hasSize(5);
        assertThat(json(mockMvc.perform(get(url(dish, "?filter=negative"))).andReturn()).get("totalItems").asInt())
                .isEqualTo(2);
        assertThat(detail(dish).get("rating").decimalValue()).isEqualByComparingTo("3.0");
    }

    private java.util.List<Integer> ratings(long dish, String filter) throws Exception {
        JsonNode items = json(mockMvc.perform(get(url(dish, "?filter=" + filter)))
                        .andExpect(status().isOk())
                        .andReturn())
                .get("items");
        java.util.List<Integer> result = new java.util.ArrayList<>();
        items.forEach(item -> result.add(item.get("rating").asInt()));
        return result;
    }

    @Test
    void aDeletedAccountKeepsItsReviewAsACustomer() throws Exception {
        Customer customer = register();
        long dish = dish();
        order(customer, dish, "ENTREGADO");
        save(customer, dish, "{\"rating\":5,\"comment\":\"Rico\"}", 200);
        jdbcTemplate.update("UPDATE product_reviews SET user_id = NULL");

        JsonNode item = list(dish, null).get("items").get(0);

        assertThat(item.get("authorName").asText()).isEqualTo("Cliente");
    }
}
