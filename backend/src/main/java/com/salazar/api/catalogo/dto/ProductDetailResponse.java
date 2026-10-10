package com.salazar.api.catalogo.dto;

import java.math.BigDecimal;
import java.util.List;

public record ProductDetailResponse(
        Long id,
        String name,
        String description,
        BigDecimal price,
        BigDecimal rating,
        boolean available,
        CategoryResponse category,
        List<String> images) {}
