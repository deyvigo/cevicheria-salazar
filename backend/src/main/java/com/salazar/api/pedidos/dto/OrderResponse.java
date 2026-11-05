package com.salazar.api.pedidos.dto;

import com.salazar.api.pedidos.DeliveryType;
import com.salazar.api.pedidos.Order;
import com.salazar.api.pedidos.OrderStatus;
import com.salazar.api.pedidos.PaymentMethod;
import java.math.BigDecimal;
import java.util.List;

public record OrderResponse(
        Long id,
        String code,
        OrderStatus status,
        DeliveryType deliveryType,
        PaymentMethod paymentMethod,
        BigDecimal subtotal,
        BigDecimal deliveryPrice,
        BigDecimal total,
        List<Item> items,
        String paymentStatus,
        String deliveryCode) {
    public record Item(Long productId, String name, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {}

    // The delivery code only leaves the server once the order is paid
    public static OrderResponse from(Order order, String paymentStatus) {
        String deliveryCode = order.getStatus() == OrderStatus.PAGADO ? order.getDeliveryCode() : null;
        return new OrderResponse(
                order.getId(),
                order.getCode(),
                order.getStatus(),
                order.getDeliveryType(),
                order.getPaymentMethod(),
                order.getSubtotal(),
                order.getDeliveryPrice(),
                order.getTotal(),
                order.getItems().stream()
                        .map(item -> new Item(
                                item.getProductId(),
                                item.getProductName(),
                                item.getUnitPrice(),
                                item.getQuantity(),
                                item.getLineTotal()))
                        .toList(),
                paymentStatus,
                deliveryCode);
    }
}
