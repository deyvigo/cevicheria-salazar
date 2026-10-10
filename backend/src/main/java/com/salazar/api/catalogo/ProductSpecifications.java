package com.salazar.api.catalogo;

import org.springframework.data.jpa.domain.Specification;

final class ProductSpecifications {
    private ProductSpecifications() {}

    static Specification<Product> active() {
        return (root, query, cb) -> cb.isTrue(root.get("active"));
    }

    static Specification<Product> inCategory(String slug) {
        return (root, query, cb) -> cb.equal(root.get("category").get("slug"), slug);
    }

    // Keep in sync with CategoryRepository.findAllWithActiveMatch
    static Specification<Product> nameMatches(String pattern) {
        return (root, query, cb) -> cb.like(
                cb.function("unaccent", String.class, cb.lower(root.get("name"))), pattern, '!');
    }
}
