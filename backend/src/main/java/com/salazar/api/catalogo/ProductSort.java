package com.salazar.api.catalogo;

import org.springframework.data.domain.Sort;

public enum ProductSort {
    PRICE_ASC("price_asc", Sort.Order.asc("price")),
    PRICE_DESC("price_desc", Sort.Order.desc("price")),
    // Unrated dishes go last in both directions: having no score is not the same as having the lowest
    RATING_ASC("rating_asc", Sort.Order.asc("rating").nullsLast()),
    RATING_DESC("rating_desc", Sort.Order.desc("rating").nullsLast()),
    NAME_ASC("name_asc", Sort.Order.asc("name")),
    NAME_DESC("name_desc", Sort.Order.desc("name"));

    private final String value;
    private final Sort.Order order;

    ProductSort(String value, Sort.Order order) {
        this.value = value;
        this.order = order;
    }

    public static ProductSort from(String value) {
        for (ProductSort sort : values()) {
            if (sort.value.equals(value)) return sort;
        }
        return NAME_ASC;
    }

    // Name and id break ties so pages stay stable while paginating
    public Sort toSort() {
        return Sort.by(order, Sort.Order.asc("name"), Sort.Order.asc("id"));
    }
}
