package com.salazar.api.catalogo;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.catalog")
public record CatalogProperties(int pageSize) {
    public CatalogProperties {
        pageSize = pageSize <= 0 ? 20 : pageSize;
    }
}
