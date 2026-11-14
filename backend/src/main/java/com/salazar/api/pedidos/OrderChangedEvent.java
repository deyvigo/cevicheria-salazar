package com.salazar.api.pedidos;

/** Something the admin orders table has to refresh for: an order just became purchased, or its delivery stage moved. */
public record OrderChangedEvent(Type type, Long orderId) {
    public enum Type {
        CREATED,
        UPDATED
    }
}
