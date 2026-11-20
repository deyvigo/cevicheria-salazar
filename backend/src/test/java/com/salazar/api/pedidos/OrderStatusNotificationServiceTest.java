package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.common.mail.MailService;
import com.salazar.api.common.mail.OrderStatusMail;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OrderStatusNotificationServiceTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final MailService mail = mock(MailService.class);
    private final OrderStatusNotificationService service = new OrderStatusNotificationService(orders, users, mail);

    private void order(DeliveryType type) {
        Order order = new Order(
                1L, "SAL-001042", "4827", PaymentMethod.CONTRAENTREGA, type, new BigDecimal("60.00"), BigDecimal.ZERO.setScale(2), null);
        when(orders.findById(10L)).thenReturn(Optional.of(order));
        when(users.findById(1L)).thenReturn(Optional.of(new User("ana@correo.com", "hash", "Ana", "Pérez", "999888777", UserRole.CLIENTE)));
    }

    private OrderStatusMail sent() {
        ArgumentCaptor<OrderStatusMail> captor = ArgumentCaptor.forClass(OrderStatusMail.class);
        verify(mail).sendOrderStatusEmail(captor.capture());
        return captor.getValue();
    }

    @Test
    void aMilestoneIsEmailedToTheOwnerWithItsMessage() {
        order(DeliveryType.RECOJO);

        service.notifyStatus(10L, DeliveryStatus.LISTO_PARA_RECOGER);

        OrderStatusMail email = sent();
        assertThat(email.to()).isEqualTo("ana@correo.com");
        assertThat(email.orderCode()).isEqualTo("SAL-001042");
        assertThat(email.message()).isEqualTo("Tu pedido está listo, puedes pasar a recogerlo");
    }

    @Test
    void theFinalMessageSaysCollectedForPickupAndDeliveredForDelivery() {
        order(DeliveryType.RECOJO);
        service.notifyStatus(10L, DeliveryStatus.ENTREGADO);
        assertThat(sent().message()).isEqualTo("Pedido recogido, ¡buen provecho!");
        assertThat(OrderStatusNotificationService.message(DeliveryStatus.ENTREGADO, DeliveryType.ENTREGA))
                .isEqualTo("Pedido entregado, ¡buen provecho!");
    }

    @Test
    void internalAndNegativeStatusesAreNotEmailed() {
        order(DeliveryType.ENTREGA);

        for (DeliveryStatus status : new DeliveryStatus[] {
            DeliveryStatus.LISTO_PARA_ENVIO, DeliveryStatus.RECHAZADO, DeliveryStatus.CANCELADO, DeliveryStatus.FALLIDO,
            DeliveryStatus.LISTO_PARA_RECOGER}) {
            service.notifyStatus(10L, status);
        }

        verify(mail, never()).sendOrderStatusEmail(any());
    }

    @Test
    void aMissingOrderIsIgnored() {
        when(orders.findById(10L)).thenReturn(Optional.empty());

        service.notifyStatus(10L, DeliveryStatus.CONFIRMADO);

        verify(mail, never()).sendOrderStatusEmail(any());
    }
}
