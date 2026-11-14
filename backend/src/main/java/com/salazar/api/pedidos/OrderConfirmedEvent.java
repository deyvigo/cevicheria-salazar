package com.salazar.api.pedidos;

/** Published inside the transaction that confirms an order (paid online, or placed as cash on delivery). */
public record OrderConfirmedEvent(Long orderId) {}
