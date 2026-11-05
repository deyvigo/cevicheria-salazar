package com.salazar.api.pedidos;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mercadopago")
public record MercadoPagoProperties(String accessToken, String webhookSecret, String publicApiUrl) {
    public boolean hasAccessToken() {
        return accessToken != null && !accessToken.isBlank();
    }

    public boolean hasWebhookSecret() {
        return webhookSecret != null && !webhookSecret.isBlank();
    }
}
