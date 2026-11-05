package com.salazar.api.pedidos;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.orders")
public record OrderProperties(Duration paymentTtl, Duration expiryGrace) {
    public OrderProperties {
        paymentTtl = paymentTtl == null ? Duration.ofMinutes(30) : paymentTtl;
        expiryGrace = expiryGrace == null ? Duration.ofMinutes(2) : expiryGrace;
    }
}
