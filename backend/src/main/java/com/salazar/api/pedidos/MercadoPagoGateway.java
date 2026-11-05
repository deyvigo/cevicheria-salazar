package com.salazar.api.pedidos;

import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferencePaymentMethodsRequest;
import com.mercadopago.client.preference.PreferencePaymentTypeRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.core.MPRequestOptions;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import com.salazar.api.common.exception.PaymentGatewayException;
import java.time.ZoneOffset;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@EnableConfigurationProperties(MercadoPagoProperties.class)
public class MercadoPagoGateway implements PaymentGateway {
    private static final String CURRENCY = "PEN";
    // Deferred methods (cash at an agent, bank deposits) can take hours, which a food order cannot wait for
    private static final List<String> EXCLUDED_PAYMENT_TYPES = List.of("ticket", "atm");

    private final MercadoPagoProperties properties;
    private final String frontendUrl;

    public MercadoPagoGateway(MercadoPagoProperties properties, @Value("${app.frontend-url}") String frontendUrl) {
        this.properties = properties;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public CheckoutSession createCheckout(CheckoutRequest request) {
        MPRequestOptions options = options();
        String returnUrl = frontendUrl + "/checkout/resultado?pedido=" + request.orderId();

        List<PreferenceItemRequest> items = request.lines().stream()
                .map(line -> PreferenceItemRequest.builder()
                        .title(line.title())
                        .quantity(line.quantity())
                        .unitPrice(line.unitPrice())
                        .currencyId(CURRENCY)
                        .build())
                .toList();

        PreferenceRequest.PreferenceRequestBuilder builder = PreferenceRequest.builder()
                .items(items)
                .externalReference(String.valueOf(request.orderId()))
                .backUrls(PreferenceBackUrlsRequest.builder()
                        .success(returnUrl)
                        .pending(returnUrl)
                        .failure(returnUrl)
                        .build())
                .paymentMethods(PreferencePaymentMethodsRequest.builder()
                        .excludedPaymentTypes(EXCLUDED_PAYMENT_TYPES.stream()
                                .map(id -> PreferencePaymentTypeRequest.builder().id(id).build())
                                .toList())
                        .build())
                // No payer is sent on purpose: the customer's e-mail may belong to a real Mercado Pago account, which
                // Mercado Pago refuses to mix with test credentials, so it asks for the e-mail on its own page
                .expires(true)
                .expirationDateTo(request.expiresAt().atOffset(ZoneOffset.UTC))
                .statementDescriptor("SALAZAR");

        if (properties.publicApiUrl() != null && !properties.publicApiUrl().isBlank()) {
            builder.notificationUrl(properties.publicApiUrl() + "/api/pagos/mercadopago/webhook");
        }
        // Mercado Pago rejects auto_return when the back URL is not public HTTPS (e.g. localhost in development)
        if (returnUrl.startsWith("https://")) {
            builder.autoReturn("approved");
        }

        try {
            Preference preference = new PreferenceClient().create(builder.build(), options);
            return new CheckoutSession(preference.getId(), preference.getInitPoint());
        } catch (MPApiException e) {
            log.error(
                    "Mercado Pago rejected the preference for order {}: status {} body {}",
                    request.orderId(),
                    e.getStatusCode(),
                    e.getApiResponse() == null ? null : e.getApiResponse().getContent());
            throw new PaymentGatewayException("Mercado Pago rechazó la preferencia.", e);
        } catch (MPException e) {
            log.error("Could not reach Mercado Pago for order {}", request.orderId(), e);
            throw new PaymentGatewayException("No se pudo contactar a Mercado Pago.", e);
        }
    }

    @Override
    public GatewayPayment getPayment(String paymentId) {
        MPRequestOptions options = options();
        long id;
        try {
            id = Long.parseLong(paymentId);
        } catch (NumberFormatException e) {
            throw new PaymentGatewayException("Identificador de pago no válido.", e);
        }
        try {
            Payment payment = new PaymentClient().get(id, options);
            return new GatewayPayment(
                    String.valueOf(payment.getId()),
                    payment.getStatus(),
                    payment.getStatusDetail(),
                    payment.getTransactionAmount(),
                    payment.getCurrencyId(),
                    payment.getExternalReference());
        } catch (MPApiException e) {
            log.error("Mercado Pago could not return payment {}: status {}", paymentId, e.getStatusCode());
            throw new PaymentGatewayException("Mercado Pago no devolvió el pago.", e);
        } catch (MPException e) {
            log.error("Could not reach Mercado Pago for payment {}", paymentId, e);
            throw new PaymentGatewayException("No se pudo contactar a Mercado Pago.", e);
        }
    }

    // Per-request token instead of MercadoPagoConfig.setAccessToken, which is global static state
    private MPRequestOptions options() {
        if (!properties.hasAccessToken()) {
            throw new PaymentGatewayException("Mercado Pago no está configurado.");
        }
        return MPRequestOptions.builder().accessToken(properties.accessToken()).build();
    }
}
