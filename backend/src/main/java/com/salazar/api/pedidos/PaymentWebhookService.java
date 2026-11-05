package com.salazar.api.pedidos;

import com.salazar.api.pedidos.PaymentGateway.GatewayPayment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PaymentWebhookService {
    private final PaymentGateway paymentGateway;
    private final PaymentSettlementService settlement;

    /**
     * The notification body is never trusted: the payment is fetched again from the provider and only that answer
     * moves the order. The fetch happens outside any transaction; settling it is idempotent because the provider
     * repeats notifications.
     */
    public void handlePayment(String paymentId) {
        GatewayPayment payment = paymentGateway.getPayment(paymentId);
        settlement.apply(payment);
    }
}
