package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;

import com.salazar.api.pedidos.dto.OrderResponse;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class OrderTest {
    private Order order(PaymentMethod method) {
        return new Order(
                1L, "SAL-000001", "1234", method, DeliveryType.RECOJO, new BigDecimal("85.00"), BigDecimal.ZERO.setScale(2), null);
    }

    @Test
    void aCashOnDeliveryOrderIsConfirmedAtOnceAndIsNotPayable() {
        Order order = order(PaymentMethod.CONTRAENTREGA);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDIENTE_COBRO);
        assertThat(order.isPending()).isFalse();
        assertThat(order.getExpiresAt()).isNull();
    }

    @Test
    void anOnlineOrderStartsPendingPayment() {
        assertThat(order(PaymentMethod.ONLINE).getStatus()).isEqualTo(OrderStatus.PENDIENTE_PAGO);
    }

    @Test
    void theChangeIsTheDeclaredAmountMinusTheTotal() {
        Order order = order(PaymentMethod.CONTRAENTREGA);
        order.setCollection(CollectionMethod.EFECTIVO, new BigDecimal("100.00"));

        assertThat(order.getChange()).isEqualByComparingTo("15.00");
    }

    @Test
    void withoutAnAmountThereIsNoChange() {
        Order order = order(PaymentMethod.CONTRAENTREGA);
        order.setCollection(CollectionMethod.EFECTIVO, null);

        assertThat(order.getChange()).isNull();
    }

    @Test
    void yapeNeverKeepsAnAmount() {
        Order order = order(PaymentMethod.CONTRAENTREGA);
        order.setCollection(CollectionMethod.YAPE, new BigDecimal("100.00"));

        assertThat(order.getCashAmount()).isNull();
        assertThat(order.getChange()).isNull();
    }

    @Test
    void theDeliveryCodeOnlyLeavesTheServerForConfirmedOrders() {
        Order cod = order(PaymentMethod.CONTRAENTREGA);
        Order online = order(PaymentMethod.ONLINE);
        Order paid = order(PaymentMethod.ONLINE);
        paid.markPaid();
        Order cancelled = order(PaymentMethod.ONLINE);
        cancelled.cancel("VENCIDO");

        assertThat(OrderResponse.from(cod, null, "Ana Pérez").deliveryCode()).isEqualTo("1234");
        assertThat(OrderResponse.from(paid, null, "Ana Pérez").deliveryCode()).isEqualTo("1234");
        assertThat(OrderResponse.from(online, null, "Ana Pérez").deliveryCode()).isNull();
        assertThat(OrderResponse.from(cancelled, null, "Ana Pérez").deliveryCode()).isNull();
    }
}
