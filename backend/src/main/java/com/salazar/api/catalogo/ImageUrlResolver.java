package com.salazar.api.catalogo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ImageUrlResolver {
    private final String baseUrl;

    public ImageUrlResolver(
            @Value("${app.minio.public-url}") String publicUrl, @Value("${app.minio.bucket}") String bucket) {
        this.baseUrl = stripTrailingSlashes(publicUrl) + "/" + stripTrailingSlashes(bucket) + "/";
    }

    public String resolve(String path) {
        return baseUrl + path.replaceFirst("^/+", "");
    }

    private static String stripTrailingSlashes(String value) {
        return value.replaceFirst("/+$", "");
    }
}
