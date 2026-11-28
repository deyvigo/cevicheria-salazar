package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

// Lives next to the order tests because it needs real orders holding the coupon
class AdminCouponControllerIT extends OrderITSupport {
    private static final String URL = "/api/admin/coupons";

    @AfterEach
    void cleanCoupons() {
        jdbcTemplate.update("DELETE FROM payments");
        jdbcTemplate.update("DELETE FROM order_items");
        jdbcTemplate.update("DELETE FROM orders");
        jdbcTemplate.update("DELETE FROM coupons");
    }

    private Customer admin() throws Exception {
        Customer admin = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", admin.email());
        return admin;
    }

    private static String code() {
        return "IT" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private static Map<String, Object> body(String code, Integer maxUses) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("discountType", "FIXED");
        body.put("discountValue", 5);
        body.put("minSubtotal", null);
        body.put("maxUses", maxUses);
        body.put("maxUsesPerCustomer", null);
        body.put("startsOn", null);
        body.put("endsOn", null);
        body.put("active", true);
        return body;
    }

    private ResultActions send(MockHttpServletRequestBuilder builder, Customer user, Object content) throws Exception {
        return mockMvc.perform(builder.cookie(user.access())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(content)));
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private long create(Customer admin, Map<String, Object> body) throws Exception {
        return json(send(post(URL), admin, body).andExpect(status().isCreated()).andReturn())
                .get("id")
                .asLong();
    }

    private JsonNode listed(Customer admin, long id) throws Exception {
        for (JsonNode coupon : json(mockMvc.perform(get(URL).cookie(admin.access()))
                .andExpect(status().isOk())
                .andReturn())) {
            if (coupon.get("id").asLong() == id) return coupon;
        }
        throw new AssertionError("Coupon " + id + " not listed");
    }

    private int quote(Customer customer, String code) throws Exception {
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        Map<String, Object> body = Map.of("code", code, "items", List.of(Map.of("productId", dish, "quantity", 1)));
        return send(post("/api/coupons/quote"), customer, body).andReturn().getResponse().getStatus();
    }

    private long buyWith(Customer customer, String code) throws Exception {
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        ObjectNode order = (ObjectNode) objectMapper.readTree(orderBody("RECOJO", null, "CONTRAENTREGA", new long[] {dish, 1}));
        order.put("couponCode", code);
        order.set("collection", objectMapper.readTree("{\"method\":\"YAPE\"}"));
        return json(createOrder(customer, objectMapper.writeValueAsString(order), 201)).get("orderId").asLong();
    }

    @Test
    void onlyAnAdministratorMayManageCoupons() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());

        Customer customer = register();
        mockMvc.perform(get(URL).cookie(customer.access())).andExpect(status().isForbidden());
        send(post(URL), customer, body(code(), null)).andExpect(status().isForbidden());
        send(put(URL + "/1"), customer, body(code(), null)).andExpect(status().isForbidden());
        send(patch(URL + "/1/active"), customer, Map.of("active", false)).andExpect(status().isForbidden());
        mockMvc.perform(delete(URL + "/1").cookie(customer.access())).andExpect(status().isForbidden());
    }

    @Test
    void aCreatedCouponWorksAtCheckoutUntilItIsDeactivated() throws Exception {
        Customer admin = admin();
        Customer customer = register();
        String code = code();
        long id = create(admin, body("  " + code.toLowerCase() + " ", null));

        assertThat(listed(admin, id).get("code").asText()).isEqualTo(code);
        assertThat(quote(customer, code)).isEqualTo(200);

        JsonNode off = json(send(patch(URL + "/" + id + "/active"), admin, Map.of("active", false))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(off.get("active").asBoolean()).isFalse();
        assertThat(quote(customer, code)).isEqualTo(422);
    }

    @Test
    void aRepeatedCodeIsAConflictOnTheCodeField() throws Exception {
        Customer admin = admin();
        String code = code();
        create(admin, body(code, null));

        JsonNode error = json(send(post(URL), admin, body(code.toLowerCase(), null))
                .andExpect(status().isConflict())
                .andReturn());
        assertThat(error.get("fieldErrors").get(0).get("field").asText()).isEqualTo("code");
    }

    @Test
    void aUsedCouponKeepsItsCodeAndItsSeatsCannotDropBelowItsUses() throws Exception {
        Customer admin = admin();
        String code = code();
        long id = create(admin, body(code, 5));
        buyWith(register(), code);

        JsonNode coupon = listed(admin, id);
        assertThat(coupon.get("uses").asLong()).isEqualTo(1);
        assertThat(coupon.get("hasOrders").asBoolean()).isTrue();

        JsonNode renamed = json(send(put(URL + "/" + id), admin, body(code(), 5))
                .andExpect(status().isBadRequest())
                .andReturn());
        assertThat(renamed.get("fieldErrors").get(0).get("field").asText()).isEqualTo("code");

        send(put(URL + "/" + id), admin, body(code, 1)).andExpect(status().isOk());
        assertThat(listed(admin, id).get("exhausted").asBoolean()).isTrue();

        mockMvc.perform(delete(URL + "/" + id).cookie(admin.access())).andExpect(status().isConflict());
    }

    @Test
    void aCancelledOrderFreesItsSeatButStillBlocksDeleting() throws Exception {
        Customer admin = admin();
        String code = code();
        long id = create(admin, body(code, 5));
        long order = buyWith(register(), code);
        jdbcTemplate.update("UPDATE orders SET status = 'CANCELADO' WHERE id = ?", order);

        JsonNode coupon = listed(admin, id);
        assertThat(coupon.get("uses").asLong()).isZero();
        assertThat(coupon.get("hasOrders").asBoolean()).isTrue();
        mockMvc.perform(delete(URL + "/" + id).cookie(admin.access())).andExpect(status().isConflict());
    }

    @Test
    void anUnusedCouponIsDeletedAndCheckoutNoLongerKnowsIt() throws Exception {
        Customer admin = admin();
        String code = code();
        long id = create(admin, body(code, null));

        mockMvc.perform(delete(URL + "/" + id).cookie(admin.access())).andExpect(status().isNoContent());
        assertThat(quote(register(), code)).isEqualTo(422);
        mockMvc.perform(delete(URL + "/" + id).cookie(admin.access())).andExpect(status().isNotFound());
    }

    @Test
    void theLastDayOfValidityIsReturnedAsSent() throws Exception {
        Customer admin = admin();
        Map<String, Object> body = body(code(), null);
        body.put("startsOn", "2026-12-24");
        body.put("endsOn", "2026-12-24");
        long id = create(admin, body);

        JsonNode coupon = listed(admin, id);
        assertThat(coupon.get("startsOn").asText()).isEqualTo("2026-12-24");
        assertThat(coupon.get("endsOn").asText()).isEqualTo("2026-12-24");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT ends_at - starts_at = interval '1 day' FROM coupons WHERE id = ?", Boolean.class, id))
                .isTrue();
    }
}
