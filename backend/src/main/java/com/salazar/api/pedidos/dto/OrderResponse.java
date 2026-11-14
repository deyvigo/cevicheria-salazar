package com.salazar.api.pedidos.dto;

import com.salazar.api.pedidos.CollectionMethod;
import com.salazar.api.pedidos.DeliveryStatus;
import com.salazar.api.pedidos.DeliveryType;
import com.salazar.api.pedidos.Order;
import com.salazar.api.pedidos.OrderStatus;
import com.salazar.api.pedidos.PaymentMethod;
import java.math.BigDecimal;
import java.time.Instant;
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
        String deliveryCode,
        CollectionMethod collectionMethod,
        BigDecimal cashAmount,
        BigDecimal change,
        String customerName,
        DeliveryStatus deliveryStatus,
        Address address,
        Instant purchasedAt,
        Instant paidAt) {
    public record Address(String label, String text, String reference) {}

    public record Item(Long productId, String name, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {}

    // The delivery code, the customer's name and the address only leave the server once the order is confirmed
    // (paid or to be collected on delivery)
    public static OrderResponse from(Order order, String paymentStatus, String customerName) {
        boolean confirmed = order.isConfirmed();
        String deliveryCode = confirmed ? order.getDeliveryCode() : null;
        Address address = confirmed && order.getDeliveryType() == DeliveryType.ENTREGA
                ? new Address(order.getAddressLabel(), order.getAddressText(), order.getAddressReference())
                : null;
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
                deliveryCode,
                order.getCollectionMethod(),
                order.getCashAmount(),
                order.getChange(),
                confirmed ? customerName : null,
                order.getDeliveryStatus(),
                address,
                order.getCreatedAt(),
                order.getPaidAt());
    }
}
