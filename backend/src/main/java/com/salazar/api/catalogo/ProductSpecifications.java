package com.salazar.api.catalogo;

import org.springframework.data.jpa.domain.Specification;

public final class ProductSpecifications {
    private ProductSpecifications() {}

    static Specification<Product> active() {
        return notDeleted().and((root, query, cb) -> cb.isTrue(root.get("active")));
    }

    public static Specification<Product> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    // Loads the category in the same query for the admin table; the count query can't fetch
    public static Specification<Product> fetchingCategory() {
        return (root, query, cb) -> {
            if (query != null && query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("category");
            }
            return cb.conjunction();
        };
    }

    static Specification<Product> inCategory(String slug) {
        return (root, query, cb) -> cb.equal(root.get("category").get("slug"), slug);
    }

    // Keep in sync with CategoryRepository.findAllWithActiveMatch
    public static Specification<Product> nameMatches(String pattern) {
        return (root, query, cb) -> cb.like(
                cb.function("unaccent", String.class, cb.lower(root.get("name"))), pattern, '!');
    }
}
