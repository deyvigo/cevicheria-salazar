package com.salazar.api.auth;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.password-reset")
public record PasswordResetProperties(Duration tokenTtl, int maxRequests, Duration requestWindow) {
    public PasswordResetProperties {
        tokenTtl = tokenTtl == null ? Duration.ofMinutes(30) : tokenTtl;
        maxRequests = maxRequests <= 0 ? 3 : maxRequests;
        requestWindow = requestWindow == null ? Duration.ofDays(1) : requestWindow;
    }
}
