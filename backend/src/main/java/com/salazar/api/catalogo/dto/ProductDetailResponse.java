package com.salazar.api.catalogo.dto;

import java.math.BigDecimal;
import java.util.List;

public record ProductDetailResponse(
        Long id,
        String name,
        String description,
        BigDecimal price,
        BigDecimal rating,
        long reviewCount,
        boolean available,
        int stock,
        CategoryResponse category,
        List<String> images) {}
