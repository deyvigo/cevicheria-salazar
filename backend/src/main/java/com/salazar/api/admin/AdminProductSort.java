package com.salazar.api.admin;

import java.util.Locale;
import org.springframework.data.domain.Sort;

public enum AdminProductSort {
    NAME("name", true),
    CATEGORY("category.name", true),
    PRICE("price", false),
    RATING("rating", false),
    STOCK("stock", false);

    private final String property;
    private final boolean text;

    AdminProductSort(String property, boolean text) {
        this.property = property;
        this.text = text;
    }

    public static AdminProductSort from(String value) {
        if (value == null) return NAME;
        for (AdminProductSort sort : values()) {
            if (sort.name().equals(value.toUpperCase(Locale.ROOT))) return sort;
        }
        return NAME;
    }

    public Sort toSort(String direction) {
        boolean descending = "desc".equalsIgnoreCase(direction);
        Sort.Order order = descending ? Sort.Order.desc(property) : Sort.Order.asc(property);
        if (text) order = order.ignoreCase();
        // Unrated dishes go last in both directions, as in the storefront
        if (this == RATING) order = order.nullsLast();
        // Name and id break ties so pages stay stable while paginating
        return Sort.by(order, Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id"));
    }
}
