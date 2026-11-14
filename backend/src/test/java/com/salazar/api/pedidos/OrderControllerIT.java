package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class OrderControllerIT extends OrderITSupport {
    private static final String URL = "/api/orders";

    @Test
    void withoutSessionItIsUnauthorized() throws Exception {
        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody("RECOJO", null, "ONLINE", new long[] {1, 1})))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get(URL + "/1")).andExpect(status().isUnauthorized());
    }

    @Test
    void anAdministratorIsForbidden() throws Exception {
        Customer admin = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", admin.email());
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);

        createOrder(admin, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}), 403);
        mockMvc.perform(get(URL + "/1").cookie(admin.access())).andExpect(status().isForbidden());
    }

    @Test
    void createsAPendingOrderWithRecalculatedAmountsReservesStockAndReturnsTheCheckoutUrl() throws Exception {
        zone("8.50");
        Customer customer = register();
        long address = addressInsideZone(customer);
        long ceviche = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        long chicha = product("Chicha " + UUID.randomUUID(), "7.50", 3);

        MvcResult result = createOrder(
                customer,
                orderBody("ENTREGA", address, "ONLINE", new long[] {ceviche, 2}, new long[] {chicha, 1}),
                201);

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        long orderId = json.get("orderId").asLong();
        assertThat(json.get("checkoutUrl").asText()).isEqualTo("https://pay.example.com/checkout?pref=" + orderId);
        assertThat(stockOf(ceviche)).isEqualTo(3);
        assertThat(stockOf(chicha)).isEqualTo(2);
        assertThat(statusOf(orderId)).isEqualTo("PENDIENTE_PAGO");

        var row = jdbcTemplate.queryForMap(
                "SELECT subtotal, delivery_price, total, delivery_zone_name, address_text, preference_id FROM orders WHERE id = ?",
                orderId);
        assertThat((BigDecimal) row.get("subtotal")).isEqualByComparingTo("67.50");
        assertThat((BigDecimal) row.get("delivery_price")).isEqualByComparingTo("8.50");
        assertThat((BigDecimal) row.get("total")).isEqualByComparingTo("76.00");
        assertThat(row.get("delivery_zone_name")).isEqualTo("Centro");
        assertThat(row.get("address_text")).isEqualTo("Av. Arequipa 123, Lince");
        assertThat(row.get("preference_id")).isEqualTo("pref-" + orderId);

        // The gateway is asked to charge the dishes plus the delivery line, with the amounts the server computed
        var checkout = gateway.checkouts.get(0);
        assertThat(checkout.lines()).hasSize(3);
        assertThat(checkout.lines().get(2).title()).isEqualTo("Entrega");
        assertThat(checkout.lines().get(2).unitPrice()).isEqualByComparingTo("8.50");
    }

    @Test
    void theOrderKeepsACopyOfNamesAndPricesWhenTheCatalogChanges() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        long orderId = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 2}));

        jdbcTemplate.update("UPDATE products SET name = 'Otro', price = 99 WHERE id = ?", dish);

        var item = jdbcTemplate.queryForMap("SELECT product_name, unit_price, line_total FROM order_items WHERE order_id = ?", orderId);
        assertThat((String) item.get("product_name")).startsWith("Ceviche ");
        assertThat((BigDecimal) item.get("unit_price")).isEqualByComparingTo("30.00");
        assertThat((BigDecimal) item.get("line_total")).isEqualByComparingTo("60.00");
    }

    @Test
    void pickupNeedsNoAddressAndHasNoDeliveryCost() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);

        long orderId = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}));

        var row = jdbcTemplate.queryForMap("SELECT delivery_price, total, address_text FROM orders WHERE id = ?", orderId);
        assertThat((BigDecimal) row.get("delivery_price")).isEqualByComparingTo("0.00");
        assertThat((BigDecimal) row.get("total")).isEqualByComparingTo("30.00");
        assertThat(row.get("address_text")).isNull();
        assertThat(gateway.checkouts.get(0).lines()).hasSize(1);
    }

    @Test
    void theClientNeverDecidesTheAmounts() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        String body = "{\"items\":[{\"productId\":" + dish + ",\"quantity\":1,\"price\":1}],"
                + "\"deliveryType\":\"RECOJO\",\"paymentMethod\":\"ONLINE\",\"total\":1,\"deliveryPrice\":0}";

        long orderId = createOnlineOrder(customer, body);

        assertThat(jdbcTemplate.queryForObject("SELECT total FROM orders WHERE id = ?", BigDecimal.class, orderId))
                .isEqualByComparingTo("30.00");
    }

    @Test
    void theSameDishListedTwiceIsMerged() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);

        long orderId = createOnlineOrder(
                customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 2}, new long[] {dish, 1}));

        assertThat(stockOf(dish)).isEqualTo(2);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM order_items WHERE order_id = ?", Integer.class, orderId))
                .isEqualTo(1);
    }

    @Test
    void everyOrderGetsAUniqueSequentialCodeAndAFourDigitDeliveryCode() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 10);

        long first = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}));
        long second = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}));

        String firstCode = jdbcTemplate.queryForObject("SELECT code FROM orders WHERE id = ?", String.class, first);
        String secondCode = jdbcTemplate.queryForObject("SELECT code FROM orders WHERE id = ?", String.class, second);
        assertThat(firstCode).matches("SAL-[0-9]{6}");
        assertThat(secondCode).matches("SAL-[0-9]{6}").isNotEqualTo(firstCode);
        assertThat(Integer.parseInt(secondCode.substring(4))).isGreaterThan(Integer.parseInt(firstCode.substring(4)));
        assertThat(jdbcTemplate.queryForObject("SELECT delivery_code FROM orders WHERE id = ?", String.class, first))
                .matches("[0-9]{4}");
    }

    @Test
    void aNewAttemptCancelsThePreviousPendingOrderAndReleasesItsStock() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 3);

        long first = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 3}));
        assertThat(stockOf(dish)).isZero();
        // Without releasing the first reservation this second order could never be placed
        long second = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 3}));

        assertThat(statusOf(first)).isEqualTo("CANCELADO");
        assertThat(statusOf(second)).isEqualTo("PENDIENTE_PAGO");
        assertThat(stockOf(dish)).isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT cancel_reason FROM orders WHERE id = ?", String.class, first))
                .isEqualTo("REEMPLAZADO");
    }

    @Test
    void anInactiveDeletedUnavailableOrOutOfStockDishIsRejectedWithoutTouchingStock() throws Exception {
        Customer customer = register();
        long inactive = product("Inactivo " + UUID.randomUUID(), "10.00", 5);
        long deleted = product("Borrado " + UUID.randomUUID(), "10.00", 5);
        long unavailable = product("Agotado " + UUID.randomUUID(), "10.00", 5);
        long empty = product("Sin stock " + UUID.randomUUID(), "10.00", 0);
        long ok = product("Bueno " + UUID.randomUUID(), "10.00", 5);
        jdbcTemplate.update("UPDATE products SET is_active = false WHERE id = ?", inactive);
        jdbcTemplate.update("UPDATE products SET deleted_at = now() WHERE id = ?", deleted);
        jdbcTemplate.update("UPDATE products SET is_available = false WHERE id = ?", unavailable);

        for (long bad : new long[] {inactive, deleted, unavailable, empty, 987654321L}) {
            createOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {ok, 1}, new long[] {bad, 1}), 409);
        }

        assertThat(stockOf(ok)).isEqualTo(5);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM orders", Integer.class)).isZero();
    }

    @Test
    void moreThanTheStockIsRejectedNamingTheDish() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 2);

        MvcResult result = createOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 3}), 409);

        assertThat(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8))
                .contains("Ceviche")
                .contains("solo tiene 2");
        assertThat(stockOf(dish)).isEqualTo(2);
    }

    @Test
    void anAddressOutsideEveryZoneIsRejected() throws Exception {
        zone("8.50");
        Customer customer = register();
        long address = addressOutsideZone(customer);
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);

        createOrder(customer, orderBody("ENTREGA", address, "ONLINE", new long[] {dish, 1}), 422);

        assertThat(stockOf(dish)).isEqualTo(5);
    }

    @Test
    void anAddressThatIsNotTheCustomersOrDeliveryWithoutAddressIsRejected() throws Exception {
        zone("8.50");
        Customer owner = register();
        Customer other = register();
        long foreign = addressInsideZone(owner);
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);

        createOrder(other, orderBody("ENTREGA", foreign, "ONLINE", new long[] {dish, 1}), 404);
        createOrder(other, orderBody("ENTREGA", 987654321L, "ONLINE", new long[] {dish, 1}), 404);
        createOrder(other, orderBody("ENTREGA", null, "ONLINE", new long[] {dish, 1}), 400);
    }

    @Test
    void invalidBodiesAndCashOnDeliveryAreRejected() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);

        createOrder(customer, orderBody("RECOJO", null, "CONTRAENTREGA", new long[] {dish, 1}), 400);
        createOrder(customer, orderBody("RECOJO", null, "ONLINE"), 400);
        createOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 0}), 400);
        createOrder(customer, "{\"items\":[{\"productId\":" + dish + ",\"quantity\":1}]}", 400);
        createOrder(customer, "not json", 400);
    }

    @Test
    void ifTheGatewayFailsTheOrderIsCancelledAndTheStockReleased() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        gateway.failCheckout = true;

        createOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 2}), 502);

        assertThat(stockOf(dish)).isEqualTo(5);
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM orders", String.class)).isEqualTo("CANCELADO");
        assertThat(jdbcTemplate.queryForObject("SELECT cancel_reason FROM orders", String.class))
                .isEqualTo("ERROR_PASARELA");
    }

    @Test
    void theLastDishGoesToOnlyOneOfTwoSimultaneousCustomers() throws Exception {
        Customer a = register();
        Customer b = register();
        long dish = product("Ultimo " + UUID.randomUUID(), "30.00", 1);
        String body = orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1});

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        Future<Integer> fa = pool.submit(() -> attempt(a, body, start));
        Future<Integer> fb = pool.submit(() -> attempt(b, body, start));
        start.countDown();
        int sa = fa.get();
        int sb = fb.get();
        pool.shutdown();

        assertThat(java.util.List.of(sa, sb)).containsExactlyInAnyOrder(201, 409);
        assertThat(stockOf(dish)).isZero();
    }

    private int attempt(Customer customer, String body, CountDownLatch start) throws Exception {
        start.await();
        return mockMvc.perform(post(URL)
                        .cookie(customer.access())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn()
                .getResponse()
                .getStatus();
    }

    @Test
    void theOwnerSeesTheOrderButTheDeliveryCodeOnlyOncePaid() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        long orderId = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 2}));
        String code = jdbcTemplate.queryForObject("SELECT code FROM orders WHERE id = ?", String.class, orderId);
        String deliveryCode = jdbcTemplate.queryForObject("SELECT delivery_code FROM orders WHERE id = ?", String.class, orderId);

        mockMvc.perform(get(URL + "/" + orderId).cookie(customer.access()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.status").value("PENDIENTE_PAGO"))
                .andExpect(jsonPath("$.total").value(60.00))
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.deliveryCode").doesNotExist());

        jdbcTemplate.update("UPDATE orders SET status = 'PAGADO', paid_at = now() WHERE id = ?", orderId);

        mockMvc.perform(get(URL + "/" + orderId).cookie(customer.access()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAGADO"))
                .andExpect(jsonPath("$.deliveryCode").value(deliveryCode));
    }

    @Test
    void anotherCustomerOrAMissingOrderIsNotFound() throws Exception {
        Customer owner = register();
        Customer other = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        long orderId = createOnlineOrder(owner, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}));

        mockMvc.perform(get(URL + "/" + orderId).cookie(other.access())).andExpect(status().isNotFound());
        mockMvc.perform(get(URL + "/987654321").cookie(owner.access())).andExpect(status().isNotFound());
    }
}
