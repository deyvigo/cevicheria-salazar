package com.salazar.api.admin;

import java.util.Locale;

public enum AdminOrderSort {
    CODE,
    DATE,
    CUSTOMER,
    ZONE,
    TOTAL,
    DELIVERYSTATUS;

    public static AdminOrderSort from(String value) {
        if (value == null) return DATE;
        String normalized = value.toUpperCase(Locale.ROOT);
        for (AdminOrderSort sort : values()) {
            if (sort.name().equals(normalized)) return sort;
        }
        return DATE;
    }
}
