package com.salazar.api.admin.dto;

import com.salazar.api.catalogo.Product;
import com.salazar.api.catalogo.ProductImage;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

public record AdminProductResponse(
        Long id,
        String name,
        String description,
        BigDecimal price,
        BigDecimal rating,
        Long categoryId,
        String categoryName,
        int stock,
        boolean active,
        boolean available,
        List<Image> images) {
    public record Image(Long id, String url) {}

    public static AdminProductResponse from(Product product, Function<String, String> urlResolver) {
        // The in-memory collection keeps insertion order right after an edit, so sort by the stored position
        List<Image> images = product.getImages().stream()
                .sorted(Comparator.comparingInt(ProductImage::getPosition))
                .map(image -> new Image(image.getId(), urlResolver.apply(image.getPath())))
                .toList();
        return new AdminProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getRating(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getStock(),
                product.isActive(),
                product.isAvailable(),
                images);
    }
}
