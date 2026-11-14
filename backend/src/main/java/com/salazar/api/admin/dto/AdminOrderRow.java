package com.salazar.api.admin.dto;

import com.salazar.api.pedidos.CollectionMethod;
import com.salazar.api.pedidos.DeliveryStatus;
import com.salazar.api.pedidos.DeliveryType;
import com.salazar.api.pedidos.Order;
import com.salazar.api.pedidos.OrderStatus;
import com.salazar.api.pedidos.PaymentMethod;
import java.math.BigDecimal;
import java.time.Instant;

public record AdminOrderRow(
        Long id,
        String code,
        Instant purchasedAt,
        String customerName,
        DeliveryType deliveryType,
        String zoneName,
        PaymentMethod paymentMethod,
        CollectionMethod collectionMethod,
        OrderStatus paymentStatus,
        BigDecimal total,
        BigDecimal cashChange,
        DeliveryStatus deliveryStatus) {

    public static AdminOrderRow from(Order order, String customerName) {
        return new AdminOrderRow(
                order.getId(),
                order.getCode(),
                purchasedAt(order),
                customerName,
                order.getDeliveryType(),
                order.getDeliveryZoneName(),
                order.getPaymentMethod(),
                order.getCollectionMethod(),
                order.getStatus(),
                order.getTotal(),
                order.getChange(),
                order.getDeliveryStatus());
    }

    public static Instant purchasedAt(Order order) {
        return order.getPaidAt() != null ? order.getPaidAt() : order.getCreatedAt();
    }
}
