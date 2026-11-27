package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class CouponIT extends OrderITSupport {
    @AfterEach
    void cleanCoupons() {
        jdbcTemplate.update("DELETE FROM payments");
        jdbcTemplate.update("DELETE FROM order_items");
        jdbcTemplate.update("DELETE FROM orders");
        jdbcTemplate.update("DELETE FROM coupons");
    }

    private String coupon(String type, String value, String extraColumns, String extraValues) {
        String code = "IT" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        jdbcTemplate.update("INSERT INTO coupons (code, discount_type, discount_value" + extraColumns + ") VALUES (?, ?, ?::numeric"
                + extraValues + ")", code, type, value);
        return code;
    }

    private String coupon(String type, String value) {
        return coupon(type, value, "", "");
    }

    private String quoteBody(String code, long[]... items) throws Exception {
        List<Map<String, Object>> list = new ArrayList<>();
        for (long[] item : items) {
            list.add(Map.of("productId", item[0], "quantity", item[1]));
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("items", list);
        return objectMapper.writeValueAsString(body);
    }

    private MvcResult quote(Customer customer, String body, int expected) throws Exception {
        return mockMvc.perform(post("/api/coupons/quote")
                        .cookie(customer.access())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is(expected))
                .andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String withCoupon(String body, String code) throws Exception {
        ObjectNode node = (ObjectNode) objectMapper.readTree(body);
        node.put("couponCode", code);
        return objectMapper.writeValueAsString(node);
    }

    private String cashBody(String code, long[]... items) throws Exception {
        ObjectNode node = (ObjectNode) objectMapper.readTree(withCoupon(orderBody("RECOJO", null, "CONTRAENTREGA", items), code));
        node.set("collection", objectMapper.readTree("{\"method\":\"YAPE\"}"));
        return objectMapper.writeValueAsString(node);
    }

    private long dish(String price, int stock) {
        return product("Ceviche " + UUID.randomUUID(), price, stock);
    }

    @Test
    void quotesTheDiscountOnCurrentPricesIgnoringCaseSpacesAndSoldOutDishes() throws Exception {
        Customer customer = register();
        String code = coupon("PERCENTAGE", "10.00");
        long a = dish("32.00", 5);
        long b = dish("18.50", 5);
        long soldOut = dish("40.00", 5);
        jdbcTemplate.update("UPDATE products SET is_available = false WHERE id = ?", soldOut);

        JsonNode body = json(quote(
                customer,
                quoteBody("  " + code.toLowerCase() + " ", new long[] {a, 2}, new long[] {b, 1}, new long[] {soldOut, 1}),
                200));

        assertThat(body.get("code").asText()).isEqualTo(code);
        assertThat(body.get("subtotal").decimalValue()).isEqualByComparingTo("82.50");
        assertThat(body.get("discount").decimalValue()).isEqualByComparingTo("8.25");
    }

    @Test
    void everyRejectionReasonHasItsOwnMessage() throws Exception {
        Customer customer = register();
        long dish = dish("30.00", 5);
        long[] line = {dish, 1};
        String expired = coupon("FIXED", "5.00", ", ends_at", ", now() - interval '1 day'");
        String future = coupon("FIXED", "5.00", ", starts_at", ", now() + interval '1 day'");
        String inactive = coupon("FIXED", "5.00", ", is_active", ", false");
        String minimum = coupon("FIXED", "5.00", ", min_subtotal", ", 40.00");
        String once = coupon("FIXED", "5.00", ", max_uses_per_customer", ", 1");
        createOrder(customer, cashBody(once, line), 201);

        assertRejection(customer, quoteBody("NOEXISTE", line), "NOT_FOUND", "Este código no es válido.");
        assertRejection(customer, quoteBody(inactive, line), "NOT_FOUND", "Este código no es válido.");
        assertRejection(customer, quoteBody(expired, line), "EXPIRED", "Este código ya venció.");
        assertRejection(customer, quoteBody(future, line), "NOT_STARTED", "Este código aún no está disponible.");
        assertRejection(
                customer, quoteBody(minimum, line), "MIN_SUBTOTAL", "Este código es válido desde una compra de S/ 40.00.");
        assertRejection(customer, quoteBody(once, line), "EXHAUSTED", "Ya no puedes usar este código.");
    }

    private void assertRejection(Customer customer, String body, String reason, String message) throws Exception {
        JsonNode error = json(quote(customer, body, 422));
        assertThat(error.get("error").asText()).isEqualTo(reason);
        assertThat(error.get("message").asText()).isEqualTo(message);
    }

    @Test
    void onlyCustomersMayQuoteAndRepeatedFailuresAreBlocked() throws Exception {
        long dish = dish("30.00", 5);
        String body = quoteBody("NOEXISTE", new long[] {dish, 1});
        mockMvc.perform(post("/api/coupons/quote").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());

        Customer admin = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", admin.email());
        quote(admin, body, 403);

        Customer customer = register();
        quote(customer, quoteBody("", new long[] {dish, 1}), 400);
        for (int i = 0; i < CouponAttemptService.MAX_FAILURES; i++) {
            quote(customer, body, 422);
        }
        // Blocked even with a valid code until the window passes
        quote(customer, quoteBody(coupon("FIXED", "5.00"), new long[] {dish, 1}), 429);
    }

    @Test
    void anOnlineOrderStoresTheDiscountAndChargesASingleLineForTheTotal() throws Exception {
        zone("8.50");
        Customer customer = register();
        long address = addressInsideZone(customer);
        long dish = dish("30.00", 5);
        String code = coupon("PERCENTAGE", "10.00");

        long orderId = createOnlineOrder(
                customer, withCoupon(orderBody("ENTREGA", address, "ONLINE", new long[] {dish, 2}), code.toLowerCase()));

        var row = jdbcTemplate.queryForMap(
                "SELECT subtotal, discount, delivery_price, total, coupon_code, coupon_id FROM orders WHERE id = ?", orderId);
        assertThat((BigDecimal) row.get("subtotal")).isEqualByComparingTo("60.00");
        assertThat((BigDecimal) row.get("discount")).isEqualByComparingTo("6.00");
        assertThat((BigDecimal) row.get("total")).isEqualByComparingTo("62.50");
        assertThat(row.get("coupon_code")).isEqualTo(code);
        assertThat(row.get("coupon_id")).isNotNull();

        var checkout = gateway.checkouts.get(0);
        assertThat(checkout.lines()).hasSize(1);
        assertThat(checkout.lines().get(0).title()).startsWith("Pedido SAL-");
        assertThat(checkout.lines().get(0).unitPrice()).isEqualByComparingTo("62.50");

        JsonNode order = json(mockMvc.perform(get("/api/orders/" + orderId).cookie(customer.access()))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(order.get("discount").decimalValue()).isEqualByComparingTo("6.00");
        assertThat(order.get("couponCode").asText()).isEqualTo(code);
    }

    @Test
    void cashOnDeliveryChecksTheAmountAgainstTheDiscountedTotal() throws Exception {
        Customer customer = register();
        long dish = dish("30.00", 5);
        String code = coupon("FIXED", "5.00");
        ObjectNode node = (ObjectNode) objectMapper.readTree(cashBody(code, new long[] {dish, 1}));
        node.set("collection", objectMapper.readTree("{\"method\":\"EFECTIVO\",\"cashAmount\":25.00}"));

        MvcResult result = createOrder(customer, objectMapper.writeValueAsString(node), 201);

        long orderId = json(result).get("orderId").asLong();
        assertThat(jdbcTemplate.queryForObject("SELECT total FROM orders WHERE id = ?", BigDecimal.class, orderId))
                .isEqualByComparingTo("25.00");
    }

    @Test
    void theAdminDetailShowsTheCouponUsed() throws Exception {
        Customer customer = register();
        long dish = dish("30.00", 5);
        String code = coupon("FIXED", "5.00");
        long orderId = json(createOrder(customer, cashBody(code, new long[] {dish, 1}), 201)).get("orderId").asLong();
        Customer admin = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", admin.email());

        JsonNode detail = json(mockMvc.perform(get("/api/admin/orders/" + orderId).cookie(admin.access()))
                .andExpect(status().isOk())
                .andReturn());

        assertThat(detail.get("discount").decimalValue()).isEqualByComparingTo("5.00");
        assertThat(detail.get("couponCode").asText()).isEqualTo(code);
    }

    @Test
    void aCouponThatNoLongerAppliesRejectsTheOrderWithoutTouchingStock() throws Exception {
        Customer customer = register();
        long dish = dish("30.00", 5);
        String minimum = coupon("FIXED", "5.00", ", min_subtotal", ", 40.00");

        MvcResult result = createOrder(customer, cashBody(minimum, new long[] {dish, 1}), 422);

        assertThat(json(result).get("error").asText()).isEqualTo("MIN_SUBTOTAL");
        assertThat(stockOf(dish)).isEqualTo(5);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM orders", Integer.class)).isZero();
    }

    @Test
    void aReplacedUnpaidOrderGivesItsUseBackButAPurchasedOneKeepsItEvenIfRejected() throws Exception {
        Customer customer = register();
        long dish = dish("30.00", 10);
        String once = coupon("FIXED", "5.00", ", max_uses_per_customer", ", 1");

        long first = createOnlineOrder(customer, withCoupon(orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}), once));
        // Placing again replaces the unpaid order, whose use is released in the same transaction
        long second = createOnlineOrder(customer, withCoupon(orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}), once));
        assertThat(statusOf(first)).isEqualTo("CANCELADO");
        assertThat(statusOf(second)).isEqualTo("PENDIENTE_PAGO");

        jdbcTemplate.update("UPDATE orders SET status = 'CANCELADO', cancel_reason = 'VENCIDO' WHERE id = ?", second);
        long cash = json(createOrder(customer, cashBody(once, new long[] {dish, 1}), 201)).get("orderId").asLong();

        jdbcTemplate.update(
                "UPDATE orders SET delivery_status = 'RECHAZADO', delivery_reason = 'Sin insumos' WHERE id = ?", cash);
        MvcResult again = createOrder(customer, cashBody(once, new long[] {dish, 1}), 422);
        assertThat(json(again).get("error").asText()).isEqualTo("EXHAUSTED");
    }

    @Test
    void concurrentOrdersCannotGoOverTheTotalLimit() throws Exception {
        long dish = dish("30.00", 50);
        String single = coupon("FIXED", "5.00", ", max_uses", ", 1");
        List<Customer> customers = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            customers.add(register());
        }

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(customers.size());
        List<Future<Integer>> results = new ArrayList<>();
        for (Customer customer : customers) {
            Callable<Integer> task = () -> {
                start.await();
                return mockMvc.perform(post("/api/orders")
                                .cookie(customer.access())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cashBody(single, new long[] {dish, 1})))
                        .andReturn()
                        .getResponse()
                        .getStatus();
            };
            results.add(pool.submit(task));
        }
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> result : results) {
            statuses.add(result.get());
        }
        pool.shutdown();

        assertThat(statuses).containsOnly(201, 422);
        assertThat(statuses.stream().filter(s -> s == 201).count()).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM orders WHERE coupon_id IS NOT NULL", Integer.class))
                .isEqualTo(1);
    }
}
