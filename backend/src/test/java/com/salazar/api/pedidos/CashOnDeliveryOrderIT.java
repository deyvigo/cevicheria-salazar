package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.web.servlet.MvcResult;

class CashOnDeliveryOrderIT extends OrderITSupport {
    private String body(String deliveryType, Long addressId, String collectionJson, long[]... items) throws Exception {
        ObjectNode node = (ObjectNode) objectMapper.readTree(orderBody(deliveryType, addressId, "CONTRAENTREGA", items));
        if (collectionJson != null) {
            node.set("collection", objectMapper.readTree(collectionJson));
        }
        return objectMapper.writeValueAsString(node);
    }

    private long dish(int stock) {
        return product("Ceviche " + UUID.randomUUID(), "30.00", stock);
    }

    @Test
    void createsAConfirmedOrderWithoutTouchingTheGatewayAndKeepsTheCashAmount() throws Exception {
        zone("8.50");
        Customer customer = register();
        long address = addressInsideZone(customer);
        long dish = dish(5);

        MvcResult result = createOrder(
                customer,
                body("ENTREGA", address, "{\"method\":\"EFECTIVO\",\"cashAmount\":100.00}", new long[] {dish, 2}),
                201);

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        long orderId = json.get("orderId").asLong();
        assertThat(json.get("checkoutUrl").isNull()).isTrue();
        assertThat(gateway.checkouts).isEmpty();
        assertThat(statusOf(orderId)).isEqualTo("PENDIENTE_COBRO");
        assertThat(stockOf(dish)).isEqualTo(3);

        var row = jdbcTemplate.queryForMap(
                "SELECT total, collection_method, cash_amount, expires_at, delivery_code FROM orders WHERE id = ?", orderId);
        assertThat((BigDecimal) row.get("total")).isEqualByComparingTo("68.50");
        assertThat(row.get("collection_method")).isEqualTo("EFECTIVO");
        assertThat((BigDecimal) row.get("cash_amount")).isEqualByComparingTo("100.00");
        assertThat(row.get("expires_at")).isNull();
        assertThat((String) row.get("delivery_code")).matches("[0-9]{4}");
    }

    @Test
    void cashWithoutAnAmountYapeAndAnAmountEqualToTheTotalAreAccepted() throws Exception {
        Customer customer = register();
        long dish = dish(10);

        long noAmount = createOnlineOrder(customer, body("RECOJO", null, "{\"method\":\"EFECTIVO\"}", new long[] {dish, 1}));
        long exact = createOnlineOrder(
                customer, body("RECOJO", null, "{\"method\":\"EFECTIVO\",\"cashAmount\":30.00}", new long[] {dish, 1}));
        long yape = createOnlineOrder(customer, body("RECOJO", null, "{\"method\":\"YAPE\"}", new long[] {dish, 1}));

        assertThat(jdbcTemplate.queryForObject("SELECT cash_amount FROM orders WHERE id = ?", BigDecimal.class, noAmount))
                .isNull();
        assertThat(jdbcTemplate.queryForObject("SELECT cash_amount FROM orders WHERE id = ?", BigDecimal.class, exact))
                .isEqualByComparingTo("30.00");
        assertThat(jdbcTemplate.queryForObject("SELECT collection_method FROM orders WHERE id = ?", String.class, yape))
                .isEqualTo("YAPE");
        // Cash orders stay confirmed: none of them is cancelled by the previous-pending-order rule
        assertThat(statusOf(noAmount)).isEqualTo("PENDIENTE_COBRO");
        assertThat(statusOf(exact)).isEqualTo("PENDIENTE_COBRO");
    }

    @Test
    void yapeNeverStoresAnAmount() throws Exception {
        Customer customer = register();
        long dish = dish(5);

        long orderId = createOnlineOrder(
                customer, body("RECOJO", null, "{\"method\":\"YAPE\",\"cashAmount\":100.00}", new long[] {dish, 1}));

        assertThat(jdbcTemplate.queryForObject("SELECT cash_amount FROM orders WHERE id = ?", BigDecimal.class, orderId))
                .isNull();
    }

    @Test
    void anAmountBelowTheTotalIncludingDeliveryIsRejectedWithoutReservingStock() throws Exception {
        zone("8.50");
        Customer customer = register();
        long address = addressInsideZone(customer);
        long dish = dish(5);

        // 30.00 + 8.50 delivery = 38.50
        MvcResult result = createOrder(
                customer, body("ENTREGA", address, "{\"method\":\"EFECTIVO\",\"cashAmount\":35.00}", new long[] {dish, 1}), 400);

        assertThat(result.getResponse().getContentAsString()).contains("El monto debe ser al menos S/ 38.50");
        assertThat(stockOf(dish)).isEqualTo(5);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM orders", Integer.class)).isZero();
    }

    @Test
    void invalidCollectionDetailsAreRejected() throws Exception {
        Customer customer = register();
        long dish = dish(5);
        long[] line = {dish, 1};

        createOrder(customer, body("RECOJO", null, null, line), 400);
        createOrder(customer, body("RECOJO", null, "{\"cashAmount\":50}", line), 400);
        createOrder(customer, body("RECOJO", null, "{\"method\":\"POS\"}", line), 400);
        createOrder(customer, body("RECOJO", null, "{\"method\":\"EFECTIVO\",\"cashAmount\":0}", line), 400);
        createOrder(customer, body("RECOJO", null, "{\"method\":\"EFECTIVO\",\"cashAmount\":-5}", line), 400);
        createOrder(customer, body("RECOJO", null, "{\"method\":\"EFECTIVO\",\"cashAmount\":50.123}", line), 400);
        createOrder(customer, body("RECOJO", null, "{\"method\":\"EFECTIVO\",\"cashAmount\":10000.01}", line), 400);

        ObjectNode online = (ObjectNode) objectMapper.readTree(orderBody("RECOJO", null, "ONLINE", line));
        online.set("collection", objectMapper.readTree("{\"method\":\"YAPE\"}"));
        createOrder(customer, objectMapper.writeValueAsString(online), 400);

        assertThat(stockOf(dish)).isEqualTo(5);
    }

    @Test
    void aPendingOnlineOrderIsCancelledWhenTheCustomerConfirmsCashOnDelivery() throws Exception {
        Customer customer = register();
        long dish = dish(5);
        long online = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 2}));
        assertThat(stockOf(dish)).isEqualTo(3);

        long cod = createOnlineOrder(customer, body("RECOJO", null, "{\"method\":\"YAPE\"}", new long[] {dish, 1}));

        assertThat(statusOf(online)).isEqualTo("CANCELADO");
        assertThat(statusOf(cod)).isEqualTo("PENDIENTE_COBRO");
        assertThat(stockOf(dish)).isEqualTo(4);
    }

    @Test
    void aCashOrderIsNotExpiredByTheJobEvenWhenOld() throws Exception {
        Customer customer = register();
        long dish = dish(5);
        long orderId = createOnlineOrder(customer, body("RECOJO", null, "{\"method\":\"YAPE\"}", new long[] {dish, 1}));
        jdbcTemplate.update("UPDATE orders SET created_at = now() - interval '2 days' WHERE id = ?", orderId);

        // No expires_at, so it can never match the expiry query
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM orders WHERE status = 'PENDIENTE_PAGO' AND expires_at < ?",
                        Integer.class,
                        java.sql.Timestamp.from(Instant.now())))
                .isZero();
        assertThat(statusOf(orderId)).isEqualTo("PENDIENTE_COBRO");
    }

    @Test
    void theOwnerSeesTheCollectionDetailAndTheDeliveryCodeButAnotherCustomerDoesNot() throws Exception {
        Customer owner = register();
        Customer other = register();
        long dish = dish(5);
        long orderId = createOnlineOrder(
                owner, body("RECOJO", null, "{\"method\":\"EFECTIVO\",\"cashAmount\":100}", new long[] {dish, 2}));
        String deliveryCode = jdbcTemplate.queryForObject("SELECT delivery_code FROM orders WHERE id = ?", String.class, orderId);

        mockMvc.perform(get("/api/pedidos/" + orderId).cookie(owner.access()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDIENTE_COBRO"))
                .andExpect(jsonPath("$.paymentMethod").value("CONTRAENTREGA"))
                .andExpect(jsonPath("$.collectionMethod").value("EFECTIVO"))
                .andExpect(jsonPath("$.cashAmount").value(100.00))
                .andExpect(jsonPath("$.change").value(40.00))
                .andExpect(jsonPath("$.deliveryCode").value(deliveryCode));
        mockMvc.perform(get("/api/pedidos/" + orderId).cookie(other.access())).andExpect(status().isNotFound());
    }

    @Autowired
    private PaymentSettlementService settlement;

    @Test
    void anApprovedGatewayPaymentNeverMarksACashOrderAsPaidAndIsFlaggedForReview() throws Exception {
        Customer customer = register();
        long dish = dish(5);
        long orderId = createOnlineOrder(customer, body("RECOJO", null, "{\"method\":\"YAPE\"}", new long[] {dish, 1}));

        settlement.apply(new PaymentGateway.GatewayPayment(
                "pay-1", "approved", "accredited", new BigDecimal("30.00"), "PEN", String.valueOf(orderId)));

        assertThat(statusOf(orderId)).isEqualTo("PENDIENTE_COBRO");
        assertThat(jdbcTemplate.queryForObject("SELECT needs_review FROM payments WHERE order_id = ?", Boolean.class, orderId))
                .isTrue();
    }

    @Test
    void theDatabaseRejectsInconsistentCollectionData() throws Exception {
        Customer customer = register();
        long dish = dish(5);
        long online = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}));
        long cod = createOnlineOrder(
                customer, body("RECOJO", null, "{\"method\":\"EFECTIVO\",\"cashAmount\":100}", new long[] {dish, 1}));

        org.junit.jupiter.api.Assertions.assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("UPDATE orders SET collection_method = 'YAPE' WHERE id = ?", online));
        org.junit.jupiter.api.Assertions.assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("UPDATE orders SET collection_method = 'YAPE' WHERE id = ?", cod));
        org.junit.jupiter.api.Assertions.assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("UPDATE orders SET cash_amount = 1 WHERE id = ?", cod));
        org.junit.jupiter.api.Assertions.assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("UPDATE orders SET collection_method = NULL WHERE id = ?", cod));
    }
}
