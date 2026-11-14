package com.salazar.api.admin.dto;

import com.salazar.api.pedidos.Order;
import java.math.BigDecimal;
import java.util.List;

/** Never carries the delivery code: it is the customer's secret. */
public record AdminOrderDetail(
        AdminOrderRow order,
        String customerPhone,
        String addressText,
        String addressReference,
        List<Item> items,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal deliveryPrice,
        BigDecimal cashAmount) {

    public record Item(String name, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}

    public static AdminOrderDetail from(Order order, String customerName, String customerPhone) {
        List<Item> items = order.getItems().stream()
                .map(item -> new Item(
                        item.getProductName(), item.getQuantity(), item.getUnitPrice(), item.getLineTotal()))
                .toList();
        return new AdminOrderDetail(
                AdminOrderRow.from(order, customerName),
                customerPhone,
                order.getAddressText(),
                order.getAddressReference(),
                items,
                order.getSubtotal(),
                order.getDiscount(),
                order.getDeliveryPrice(),
                order.getCashAmount());
    }
}
