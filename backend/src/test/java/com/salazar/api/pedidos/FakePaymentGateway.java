package com.salazar.api.pedidos;

import com.salazar.api.common.exception.PaymentGatewayException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** In-memory stand-in for Mercado Pago, so the order and payment flows run without any network. */
public class FakePaymentGateway implements PaymentGateway {
    public final List<CheckoutRequest> checkouts = new ArrayList<>();
    public final Map<String, GatewayPayment> payments = new ConcurrentHashMap<>();
    public boolean failCheckout;
    public boolean failGetPayment;

    public void reset() {
        checkouts.clear();
        payments.clear();
        failCheckout = false;
        failGetPayment = false;
    }

    @Override
    public synchronized CheckoutSession createCheckout(CheckoutRequest request) {
        if (failCheckout) {
            throw new PaymentGatewayException("boom");
        }
        checkouts.add(request);
        return new CheckoutSession("pref-" + request.orderId(), "https://pay.example.com/checkout?pref=" + request.orderId());
    }

    @Override
    public GatewayPayment getPayment(String paymentId) {
        if (failGetPayment) {
            throw new PaymentGatewayException("boom");
        }
        GatewayPayment payment = payments.get(paymentId);
        if (payment == null) {
            throw new PaymentGatewayException("unknown payment " + paymentId);
        }
        return payment;
    }
}
