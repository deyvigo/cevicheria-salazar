package com.salazar.api.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.default-admin")
public record DefaultAdminProperties(
        boolean enabled, String email, String password, String firstName, String lastName, String phone) {}
