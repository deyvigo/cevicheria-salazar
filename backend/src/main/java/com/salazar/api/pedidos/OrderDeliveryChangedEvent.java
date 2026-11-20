package com.salazar.api.pedidos;

/** Published inside the transaction that moves the delivery of a purchased order to a new status. */
public record OrderDeliveryChangedEvent(Long orderId, DeliveryStatus status) {}
