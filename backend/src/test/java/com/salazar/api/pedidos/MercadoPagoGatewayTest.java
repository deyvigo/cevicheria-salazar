package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.salazar.api.common.exception.PaymentGatewayException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class MercadoPagoGatewayTest {
    private final MercadoPagoGateway gateway =
            new MercadoPagoGateway(new MercadoPagoProperties("", "secret", ""), "http://localhost:5173");

    @Test
    void creatingACheckoutWithoutAnAccessTokenFailsAsAGatewayError() {
        var request = new PaymentGateway.CheckoutRequest(
                1L, "SAL-000001", List.of(), Instant.now().plusSeconds(60));

        assertThatThrownBy(() -> gateway.createCheckout(request)).isInstanceOf(PaymentGatewayException.class);
    }

    @Test
    void fetchingAPaymentWithoutAnAccessTokenFailsAsAGatewayError() {
        assertThatThrownBy(() -> gateway.getPayment("123")).isInstanceOf(PaymentGatewayException.class);
    }

    @Test
    void aPaymentIdThatIsNotNumericIsRejectedBeforeCallingTheProvider() {
        MercadoPagoGateway configured =
                new MercadoPagoGateway(new MercadoPagoProperties("token", "secret", ""), "http://localhost:5173");

        assertThatThrownBy(() -> configured.getPayment("not-a-number")).isInstanceOf(PaymentGatewayException.class);
    }
}
