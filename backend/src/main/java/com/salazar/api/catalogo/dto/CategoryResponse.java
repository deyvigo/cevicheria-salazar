package com.salazar.api.catalogo.dto;

import com.salazar.api.catalogo.Category;

public record CategoryResponse(Long id, String name, String slug) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getSlug());
    }
}
