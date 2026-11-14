package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.salazar.api.common.mail.OrderConfirmationMail;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class MercadoPagoWebhookControllerIT extends OrderITSupport {
    private static final String URL = "/api/payments/mercadopago/webhook";

    private record Placed(Customer customer, long orderId, long productId) {}

    private Placed placeOrder() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        long orderId = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 2}));
        return new Placed(customer, orderId, dish);
    }

    private void payment(String id, String status, String amount, String currency, Object reference) {
        gateway.payments.put(
                id,
                new PaymentGateway.GatewayPayment(
                        id, status, "detail", new BigDecimal(amount), currency, String.valueOf(reference)));
    }

    private ResultActions notify(String paymentId, String type) throws Exception {
        String ts = "1700000000";
        String requestId = "req-" + UUID.randomUUID();
        String v1 = MercadoPagoSignatureVerifierTest.sign(WEBHOOK_SECRET, "id:" + paymentId + ";request-id:" + requestId + ";ts:" + ts + ";");
        return mockMvc.perform(post(URL)
                .param("data.id", paymentId)
                .param("type", type)
                .header("x-signature", "ts=" + ts + ",v1=" + v1)
                .header("x-request-id", requestId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"payment.updated\",\"type\":\"" + type + "\",\"data\":{\"id\":\"" + paymentId + "\"}}"));
    }

    private int paymentRows() {
        return jdbcTemplate.queryForObject("SELECT count(*) FROM payments", Integer.class);
    }

    @Test
    void aSignedNotificationOfAnApprovedPaymentMarksTheOrderAsPaid() throws Exception {
        Placed placed = placeOrder();
        payment("1001", "approved", "60.00", "PEN", placed.orderId());

        notify("1001", "payment").andExpect(status().isOk());

        assertThat(statusOf(placed.orderId())).isEqualTo("PAGADO");
        assertThat(jdbcTemplate.queryForObject("SELECT paid_at IS NOT NULL FROM orders WHERE id = ?", Boolean.class, placed.orderId()))
                .isTrue();
        assertThat(paymentRows()).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT needs_review FROM payments", Boolean.class)).isFalse();
        // The paid order now exposes its delivery code to its owner
        mockMvc.perform(get("/api/orders/" + placed.orderId()).cookie(placed.customer().access()))
                .andExpect(jsonPath("$.status").value("PAGADO"))
                .andExpect(jsonPath("$.deliveryCode").exists());
    }

    @Test
    void noSessionIsNeededButTheSignatureIs() throws Exception {
        Placed placed = placeOrder();
        payment("1002", "approved", "60.00", "PEN", placed.orderId());

        mockMvc.perform(post(URL).param("data.id", "1002").param("type", "payment"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post(URL)
                        .param("data.id", "1002")
                        .param("type", "payment")
                        .header("x-signature", "ts=1700000000,v1=deadbeef")
                        .header("x-request-id", "req-1"))
                .andExpect(status().isUnauthorized());

        assertThat(statusOf(placed.orderId())).isEqualTo("PENDIENTE_PAGO");
        assertThat(paymentRows()).isZero();
    }

    @Test
    void theBodyIsNotTrustedOnlyTheProvidersAnswerMovesTheOrder() throws Exception {
        Placed placed = placeOrder();
        // The notification claims payment 1003, but the provider says that payment was rejected
        payment("1003", "rejected", "60.00", "PEN", placed.orderId());

        notify("1003", "payment").andExpect(status().isOk());

        assertThat(statusOf(placed.orderId())).isEqualTo("PENDIENTE_PAGO");
    }

    @Test
    void theSameNotificationRepeatedLeavesTheSameState() throws Exception {
        Placed placed = placeOrder();
        payment("1004", "approved", "60.00", "PEN", placed.orderId());

        notify("1004", "payment").andExpect(status().isOk());
        notify("1004", "payment").andExpect(status().isOk());
        notify("1004", "payment").andExpect(status().isOk());

        assertThat(statusOf(placed.orderId())).isEqualTo("PAGADO");
        assertThat(paymentRows()).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT needs_review FROM payments", Boolean.class)).isFalse();
    }

    @Test
    void anApprovedPaymentForADifferentAmountDoesNotPayTheOrderAndIsFlagged() throws Exception {
        Placed placed = placeOrder();
        payment("1005", "approved", "10.00", "PEN", placed.orderId());

        notify("1005", "payment").andExpect(status().isOk());

        assertThat(statusOf(placed.orderId())).isEqualTo("PENDIENTE_PAGO");
        assertThat(jdbcTemplate.queryForObject("SELECT needs_review FROM payments", Boolean.class)).isTrue();
    }

    @Test
    void anApprovedPaymentInAnotherCurrencyDoesNotPayTheOrder() throws Exception {
        Placed placed = placeOrder();
        payment("1006", "approved", "60.00", "USD", placed.orderId());

        notify("1006", "payment").andExpect(status().isOk());

        assertThat(statusOf(placed.orderId())).isEqualTo("PENDIENTE_PAGO");
        assertThat(jdbcTemplate.queryForObject("SELECT needs_review FROM payments", Boolean.class)).isTrue();
    }

    @Test
    void aPaymentThatArrivesAfterTheOrderWasCancelledIsFlaggedAndDoesNotReviveIt() throws Exception {
        Placed placed = placeOrder();
        jdbcTemplate.update("UPDATE orders SET status = 'CANCELADO', cancel_reason = 'VENCIDO' WHERE id = ?", placed.orderId());
        jdbcTemplate.update("UPDATE products SET stock = 5 WHERE id = ?", placed.productId());
        payment("1007", "approved", "60.00", "PEN", placed.orderId());

        notify("1007", "payment").andExpect(status().isOk());

        assertThat(statusOf(placed.orderId())).isEqualTo("CANCELADO");
        assertThat(stockOf(placed.productId())).isEqualTo(5);
        assertThat(jdbcTemplate.queryForObject("SELECT needs_review FROM payments", Boolean.class)).isTrue();
    }

    @Test
    void aSecondApprovedPaymentForAnAlreadyPaidOrderIsFlagged() throws Exception {
        Placed placed = placeOrder();
        payment("1008", "approved", "60.00", "PEN", placed.orderId());
        payment("1009", "approved", "60.00", "PEN", placed.orderId());

        notify("1008", "payment").andExpect(status().isOk());
        notify("1009", "payment").andExpect(status().isOk());

        assertThat(statusOf(placed.orderId())).isEqualTo("PAGADO");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT needs_review FROM payments WHERE provider_payment_id = '1008'", Boolean.class))
                .isFalse();
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT needs_review FROM payments WHERE provider_payment_id = '1009'", Boolean.class))
                .isTrue();
    }

    @Test
    void aRejectedPaymentIsRecordedButTheOrderStaysPendingSoTheCustomerCanTryAgain() throws Exception {
        Placed placed = placeOrder();
        payment("1010", "rejected", "60.00", "PEN", placed.orderId());

        notify("1010", "payment").andExpect(status().isOk());

        assertThat(statusOf(placed.orderId())).isEqualTo("PENDIENTE_PAGO");
        assertThat(stockOf(placed.productId())).isEqualTo(3);
        mockMvc.perform(get("/api/orders/" + placed.orderId()).cookie(placed.customer().access()))
                .andExpect(jsonPath("$.status").value("PENDIENTE_PAGO"))
                .andExpect(jsonPath("$.paymentStatus").value("rejected"));

        // The retry inside Mercado Pago ends up approved
        payment("1011", "approved", "60.00", "PEN", placed.orderId());
        notify("1011", "payment").andExpect(status().isOk());
        assertThat(statusOf(placed.orderId())).isEqualTo("PAGADO");
    }

    @Test
    void otherEventTypesAndUnknownOrdersAreAcknowledgedAndIgnored() throws Exception {
        Placed placed = placeOrder();
        payment("1012", "approved", "60.00", "PEN", placed.orderId());
        payment("1013", "approved", "60.00", "PEN", 987654321L);
        payment("1014", "approved", "60.00", "PEN", "not-a-number");

        notify("1012", "merchant_order").andExpect(status().isOk());
        notify("1013", "payment").andExpect(status().isOk());
        notify("1014", "payment").andExpect(status().isOk());

        assertThat(statusOf(placed.orderId())).isEqualTo("PENDIENTE_PAGO");
        assertThat(paymentRows()).isZero();
    }

    @Test
    void whenTheProviderCannotBeReachedTheAnswerIsRetryable() throws Exception {
        Placed placed = placeOrder();
        gateway.failGetPayment = true;

        notify("1015", "payment").andExpect(status().isServiceUnavailable());

        assertThat(statusOf(placed.orderId())).isEqualTo("PENDIENTE_PAGO");
    }

    @Test
    void anApprovedPaymentSendsOneConfirmationEmailAndARepeatedNotificationDoesNot() throws Exception {
        Placed placed = placeOrder();
        assertNoConfirmationEmail();
        payment("1101", "approved", "60.00", "PEN", placed.orderId());

        notify("1101", "payment").andExpect(status().isOk());
        OrderConfirmationMail mail = confirmationEmail();
        notify("1101", "payment").andExpect(status().isOk());
        notify("1101", "payment").andExpect(status().isOk());

        assertSingleConfirmationEmail();
        assertThat(mail.to()).isEqualTo(placed.customer().email());
        assertThat(mail.paymentStatus()).isEqualTo("Pagado");
        assertThat(mail.paymentSummary()).isEqualTo("Pago en línea");
        assertThat(mail.paidAt()).doesNotContain("Pendiente");
        assertThat(mail.total()).isEqualTo("S/ 60.00");
    }

    @Test
    void aPaidOrderExposesBothDatesAndAPendingOneHidesTheConfirmationData() throws Exception {
        Placed placed = placeOrder();
        mockMvc.perform(get("/api/orders/" + placed.orderId()).cookie(placed.customer().access()))
                .andExpect(jsonPath("$.customerName").doesNotExist())
                .andExpect(jsonPath("$.address").doesNotExist())
                .andExpect(jsonPath("$.deliveryCode").doesNotExist())
                .andExpect(jsonPath("$.purchasedAt").exists())
                .andExpect(jsonPath("$.paidAt").doesNotExist());

        payment("1102", "approved", "60.00", "PEN", placed.orderId());
        notify("1102", "payment").andExpect(status().isOk());

        mockMvc.perform(get("/api/orders/" + placed.orderId()).cookie(placed.customer().access()))
                .andExpect(jsonPath("$.customerName").value("María Quispe"))
                .andExpect(jsonPath("$.paidAt").exists())
                .andExpect(jsonPath("$.purchasedAt").exists());
    }

    @Test
    void rejectedOrPendingPaymentsAndLateOnesSendNoEmail() throws Exception {
        Placed placed = placeOrder();
        payment("1103", "rejected", "60.00", "PEN", placed.orderId());
        payment("1104", "pending", "60.00", "PEN", placed.orderId());
        notify("1103", "payment").andExpect(status().isOk());
        notify("1104", "payment").andExpect(status().isOk());
        assertNoConfirmationEmail();

        Placed cancelled = placeOrder();
        jdbcTemplate.update("UPDATE orders SET status = 'CANCELADO', cancel_reason = 'VENCIDO' WHERE id = ?", cancelled.orderId());
        jdbcTemplate.update("UPDATE products SET stock = 5 WHERE id = ?", cancelled.productId());
        payment("1105", "approved", "60.00", "PEN", cancelled.orderId());
        notify("1105", "payment").andExpect(status().isOk());
        assertNoConfirmationEmail();
    }

    @Test
    void aWrongAmountNeverSendsTheEmail() throws Exception {
        Placed placed = placeOrder();
        payment("1106", "approved", "10.00", "PEN", placed.orderId());

        notify("1106", "payment").andExpect(status().isOk());

        assertNoConfirmationEmail();
    }
}
