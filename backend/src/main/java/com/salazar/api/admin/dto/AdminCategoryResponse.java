package com.salazar.api.admin.dto;

import com.salazar.api.catalogo.Category;

public record AdminCategoryResponse(Long id, String name, String slug, long productCount) {
    public static AdminCategoryResponse from(Category category, long productCount) {
        return new AdminCategoryResponse(category.getId(), category.getName(), category.getSlug(), productCount);
    }
}
