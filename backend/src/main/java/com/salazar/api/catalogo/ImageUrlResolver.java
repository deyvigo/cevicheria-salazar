package com.salazar.api.catalogo;

import com.salazar.api.common.config.StorageProperties;
import org.springframework.stereotype.Component;

@Component
public class ImageUrlResolver {
    private final String baseUrl;

    public ImageUrlResolver(StorageProperties properties) {
        this.baseUrl = properties.publicBaseUrl().replaceFirst("/+$", "") + "/";
    }

    public String resolve(String path) {
        return baseUrl + path.replaceFirst("^/+", "");
    }
}
