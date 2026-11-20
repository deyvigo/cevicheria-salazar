package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.common.exception.OrderDeliveryConflictException;

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

    private Order purchased() {
        Order order = order(PaymentMethod.ONLINE);
        order.markPaid();
        return order;
    }

    private Order purchased(DeliveryType type) {
        Order order = new Order(
                1L, "SAL-000001", "1234", PaymentMethod.ONLINE, type, new BigDecimal("85.00"), BigDecimal.ZERO.setScale(2), null);
        order.markPaid();
        return order;
    }

    private void walk(Order order, DeliveryStatus... steps) {
        DeliveryStatus current = order.getDeliveryStatus();
        for (DeliveryStatus step : steps) {
            order.moveDelivery(current, step, null, "1234");
            current = step;
        }
    }

    @Test
    void aPurchasedOrderStartsPending() {
        assertThat(purchased().getDeliveryStatus()).isEqualTo(DeliveryStatus.PENDIENTE);
    }

    @Test
    void aPickupOrderGoesThroughReadyToCollect() {
        Order order = purchased(DeliveryType.RECOJO);

        walk(order, DeliveryStatus.CONFIRMADO, DeliveryStatus.EN_PREPARACION, DeliveryStatus.LISTO_PARA_RECOGER,
                DeliveryStatus.ENTREGADO);

        assertThat(order.getDeliveryStatus()).isEqualTo(DeliveryStatus.ENTREGADO);
    }

    @Test
    void aDeliveryOrderGoesThroughReadyToShipAndOnTheWay() {
        Order order = purchased(DeliveryType.ENTREGA);

        walk(order, DeliveryStatus.CONFIRMADO, DeliveryStatus.EN_PREPARACION, DeliveryStatus.LISTO_PARA_ENVIO,
                DeliveryStatus.EN_CAMINO, DeliveryStatus.ENTREGADO);

        assertThat(order.getDeliveryStatus()).isEqualTo(DeliveryStatus.ENTREGADO);
    }

    @Test
    void theStepsOfTheOtherKindOfOrderAreRejected() {
        Order pickup = purchased(DeliveryType.RECOJO);
        walk(pickup, DeliveryStatus.CONFIRMADO, DeliveryStatus.EN_PREPARACION);
        Order delivery = purchased(DeliveryType.ENTREGA);
        walk(delivery, DeliveryStatus.CONFIRMADO, DeliveryStatus.EN_PREPARACION);

        assertThatThrownBy(() -> pickup.moveDelivery(DeliveryStatus.EN_PREPARACION, DeliveryStatus.LISTO_PARA_ENVIO, null, null))
                .isInstanceOf(OrderDeliveryConflictException.class);
        assertThatThrownBy(() -> delivery.moveDelivery(DeliveryStatus.EN_PREPARACION, DeliveryStatus.LISTO_PARA_RECOGER, null, null))
                .isInstanceOf(OrderDeliveryConflictException.class);
    }

    @Test
    void stepsCannotBeSkippedOrUndone() {
        Order order = purchased(DeliveryType.RECOJO);

        assertThatThrownBy(() -> order.moveDelivery(DeliveryStatus.PENDIENTE, DeliveryStatus.ENTREGADO, null, null))
                .isInstanceOf(OrderDeliveryConflictException.class);
        walk(order, DeliveryStatus.CONFIRMADO);
        assertThatThrownBy(() -> order.moveDelivery(DeliveryStatus.CONFIRMADO, DeliveryStatus.PENDIENTE, null, null))
                .isInstanceOf(OrderDeliveryConflictException.class);
    }

    @Test
    void aFinalOrderCannotMoveAgain() {
        Order order = purchased(DeliveryType.RECOJO);
        walk(order, DeliveryStatus.CONFIRMADO, DeliveryStatus.EN_PREPARACION, DeliveryStatus.LISTO_PARA_RECOGER,
                DeliveryStatus.ENTREGADO);

        assertThatThrownBy(() -> order.moveDelivery(DeliveryStatus.ENTREGADO, DeliveryStatus.CANCELADO, "x", null))
                .isInstanceOf(OrderDeliveryConflictException.class);
    }

    @Test
    void aStaleViewOfTheStageIsRejectedAndLeavesTheOrderUntouched() {
        Order order = purchased(DeliveryType.RECOJO);
        walk(order, DeliveryStatus.CONFIRMADO);

        assertThatThrownBy(() -> order.moveDelivery(DeliveryStatus.PENDIENTE, DeliveryStatus.CONFIRMADO, null, null))
                .isInstanceOf(OrderDeliveryConflictException.class);
        assertThat(order.getDeliveryStatus()).isEqualTo(DeliveryStatus.CONFIRMADO);
    }

    @Test
    void anOrderStillPendingPaymentHasNoDeliveryToMove() {
        Order order = order(PaymentMethod.ONLINE);

        assertThatThrownBy(() -> order.moveDelivery(DeliveryStatus.PENDIENTE, DeliveryStatus.CONFIRMADO, null, null))
                .isInstanceOf(OrderDeliveryConflictException.class);
    }

    @Test
    void rejectingCancellingOrFailingNeedsAReason() {
        Order order = purchased(DeliveryType.RECOJO);

        assertThatThrownBy(() -> order.moveDelivery(DeliveryStatus.PENDIENTE, DeliveryStatus.RECHAZADO, " ", null))
                .isInstanceOf(FieldInvalidException.class);
        assertThatThrownBy(() -> order.moveDelivery(DeliveryStatus.PENDIENTE, DeliveryStatus.RECHAZADO, "x".repeat(201), null))
                .isInstanceOf(FieldInvalidException.class);
        assertThat(order.getDeliveryStatus()).isEqualTo(DeliveryStatus.PENDIENTE);
    }

    @Test
    void rejectingAPaidOrderStoresTheReasonAndFlagsTheRefund() {
        Order order = purchased(DeliveryType.RECOJO);

        order.moveDelivery(DeliveryStatus.PENDIENTE, DeliveryStatus.RECHAZADO, "Sin insumos", null);

        assertThat(order.getDeliveryReason()).isEqualTo("Sin insumos");
        assertThat(order.getRefundStatus()).isEqualTo(RefundStatus.PENDIENTE);
        order.markRefunded();
        assertThat(order.getRefundStatus()).isEqualTo(RefundStatus.REEMBOLSADO);
    }

    @Test
    void cashOnDeliveryOrdersAndFailedDeliveriesNeverOweARefund() {
        Order cash = order(PaymentMethod.CONTRAENTREGA);
        cash.moveDelivery(DeliveryStatus.PENDIENTE, DeliveryStatus.CANCELADO, "Cliente no responde", null);
        assertThat(cash.getRefundStatus()).isNull();

        Order failed = purchased(DeliveryType.RECOJO);
        walk(failed, DeliveryStatus.CONFIRMADO, DeliveryStatus.EN_PREPARACION, DeliveryStatus.LISTO_PARA_RECOGER);
        failed.moveDelivery(DeliveryStatus.LISTO_PARA_RECOGER, DeliveryStatus.FALLIDO, "No recogió", null);
        assertThat(failed.getRefundStatus()).isNull();
        assertThatThrownBy(failed::markRefunded).isInstanceOf(OrderDeliveryConflictException.class);
    }

    @Test
    void anOrderOnTheWayCannotBeCancelledButCanFail() {
        Order order = purchased(DeliveryType.ENTREGA);
        walk(order, DeliveryStatus.CONFIRMADO, DeliveryStatus.EN_PREPARACION, DeliveryStatus.LISTO_PARA_ENVIO,
                DeliveryStatus.EN_CAMINO);

        assertThatThrownBy(() -> order.moveDelivery(DeliveryStatus.EN_CAMINO, DeliveryStatus.CANCELADO, "x", null))
                .isInstanceOf(OrderDeliveryConflictException.class);
        order.moveDelivery(DeliveryStatus.EN_CAMINO, DeliveryStatus.FALLIDO, "Cliente ausente", null);
        assertThat(order.getDeliveryStatus()).isEqualTo(DeliveryStatus.FALLIDO);
    }

    @Test
    void deliveringNeedsTheDeliveryCodeOfTheOrder() {
        Order order = purchased(DeliveryType.RECOJO);
        walk(order, DeliveryStatus.CONFIRMADO, DeliveryStatus.EN_PREPARACION, DeliveryStatus.LISTO_PARA_RECOGER);

        for (String wrong : new String[] {null, "", "9999"}) {
            assertThatThrownBy(() -> order.moveDelivery(DeliveryStatus.LISTO_PARA_RECOGER, DeliveryStatus.ENTREGADO, null, wrong))
                    .isInstanceOf(FieldInvalidException.class);
        }
        assertThat(order.getDeliveryStatus()).isEqualTo(DeliveryStatus.LISTO_PARA_RECOGER);
        order.moveDelivery(DeliveryStatus.LISTO_PARA_RECOGER, DeliveryStatus.ENTREGADO, null, " 1234 ");
        assertThat(order.getDeliveryStatus()).isEqualTo(DeliveryStatus.ENTREGADO);
    }

    @Test
    void onlyTheMilestonesNotifyTheCustomer() {
        assertThat(DeliveryStatus.CONFIRMADO.notifiesCustomer(DeliveryType.RECOJO)).isTrue();
        assertThat(DeliveryStatus.LISTO_PARA_RECOGER.notifiesCustomer(DeliveryType.RECOJO)).isTrue();
        assertThat(DeliveryStatus.EN_CAMINO.notifiesCustomer(DeliveryType.ENTREGA)).isTrue();
        assertThat(DeliveryStatus.LISTO_PARA_ENVIO.notifiesCustomer(DeliveryType.ENTREGA)).isFalse();
        assertThat(DeliveryStatus.RECHAZADO.notifiesCustomer(DeliveryType.ENTREGA)).isFalse();
        assertThat(DeliveryStatus.FALLIDO.notifiesCustomer(DeliveryType.RECOJO)).isFalse();
    }
}
