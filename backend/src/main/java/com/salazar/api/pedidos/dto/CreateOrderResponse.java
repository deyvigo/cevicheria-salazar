package com.salazar.api.pedidos.dto;

public record CreateOrderResponse(Long orderId, String checkoutUrl) {}
