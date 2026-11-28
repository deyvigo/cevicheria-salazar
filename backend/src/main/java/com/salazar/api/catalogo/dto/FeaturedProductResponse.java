package com.salazar.api.catalogo.dto;

import java.math.BigDecimal;

public record FeaturedProductResponse(
        Long id,
        String name,
        String description,
        BigDecimal price,
        BigDecimal rating,
        String imageUrl,
        boolean available,
        int stock,
        boolean bestSeller) {

    public static FeaturedProductResponse of(ProductResponse product, boolean bestSeller) {
        return new FeaturedProductResponse(
                product.id(),
                product.name(),
                product.description(),
                product.price(),
                product.rating(),
                product.imageUrl(),
                product.available(),
                product.stock(),
                bestSeller);
    }
}
