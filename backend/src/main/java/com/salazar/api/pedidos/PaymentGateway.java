package com.salazar.api.pedidos;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Boundary with the payment provider; nothing outside its implementation knows the provider's SDK. */
public interface PaymentGateway {
    CheckoutSession createCheckout(CheckoutRequest request);

    GatewayPayment getPayment(String paymentId);

    record CheckoutRequest(
            Long orderId,
            String orderCode,
            List<Line> lines,
            Instant expiresAt) {
        public record Line(String title, int quantity, BigDecimal unitPrice) {}
    }

    record CheckoutSession(String preferenceId, String checkoutUrl) {}

    record GatewayPayment(
            String id,
            String status,
            String statusDetail,
            BigDecimal amount,
            String currency,
            String externalReference) {}
}
