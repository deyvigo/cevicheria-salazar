package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.common.mail.MailService;
import com.salazar.api.common.mail.OrderConfirmationMail;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class OrderConfirmationServiceTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final MailService mail = mock(MailService.class);
    private final OrderConfirmationService service = new OrderConfirmationService(orders, users, mail);

    private final User user = new User("ana@correo.com", "hash", "Ana", "Pérez", "999888777", UserRole.CLIENTE);

    private Order order(PaymentMethod method, DeliveryType type) {
        Order order = new Order(
                1L, "SAL-001042", "4827", method, type, new BigDecimal("60.00"), new BigDecimal("8.50"), null);
        order.addItem(5L, "Ceviche", new BigDecimal("30.00"), 2);
        ReflectionTestUtils.setField(order, "id", 10L);
        ReflectionTestUtils.setField(order, "createdAt", Instant.parse("2026-11-08T04:30:00Z"));
        return order;
    }

    private void claimed(Order order) {
        when(orders.claimConfirmationEmail(anyLong(), any())).thenReturn(1);
        when(orders.findByIdWithItems(10L)).thenReturn(Optional.of(order));
        when(users.findById(1L)).thenReturn(Optional.of(user));
    }

    @Test
    void sendsToTheOwnersAccountEmailWhenItClaimsTheOrder() {
        Order order = order(PaymentMethod.CONTRAENTREGA, DeliveryType.RECOJO);
        order.setCollection(CollectionMethod.EFECTIVO, new BigDecimal("100.00"));
        claimed(order);

        service.sendConfirmation(10L);

        ArgumentCaptor<OrderConfirmationMail> captor = ArgumentCaptor.forClass(OrderConfirmationMail.class);
        verify(mail).sendOrderConfirmationEmail(captor.capture());
        OrderConfirmationMail sent = captor.getValue();
        assertThat(sent.to()).isEqualTo("ana@correo.com");
        assertThat(sent.customerName()).isEqualTo("Ana Pérez");
        assertThat(sent.deliveryCode()).isEqualTo("4827");
        assertThat(sent.receiving()).isEqualTo("Recojo en tienda");
        assertThat(sent.delivery()).isEqualTo("Recojo en tienda, sin costo");
        assertThat(sent.paymentSummary()).contains("S/ 100.00").contains("vuelto S/ 31.50");
        assertThat(sent.paymentStatus()).isEqualTo("Pago pendiente al recibir");
        // 04:30 UTC is still the previous evening in Lima
        assertThat(sent.purchasedAt()).contains("7").contains("23:30");
        assertThat(sent.paidAt()).isEqualTo("Pendiente, se paga al recibir");
    }

    @Test
    void doesNothingWhenAnotherCallAlreadyClaimedTheOrder() {
        when(orders.claimConfirmationEmail(anyLong(), any())).thenReturn(0);

        service.sendConfirmation(10L);

        verify(mail, never()).sendOrderConfirmationEmail(any());
        verify(orders, never()).findByIdWithItems(anyLong());
    }

    @Test
    void doesNotSendForAnOrderThatIsNotConfirmed() {
        claimed(order(PaymentMethod.ONLINE, DeliveryType.RECOJO));

        service.sendConfirmation(10L);

        verify(mail, never()).sendOrderConfirmationEmail(any());
    }

    @Test
    void failuresAreSwallowed() {
        Order order = order(PaymentMethod.CONTRAENTREGA, DeliveryType.RECOJO);
        claimed(order);
        doThrow(new RuntimeException("smtp")).when(mail).sendOrderConfirmationEmail(any());

        assertThatCode(() -> service.sendConfirmation(10L)).doesNotThrowAnyException();
    }

    @Test
    void anOnlineOrderEmailShowsBothDates() {
        Order order = order(PaymentMethod.ONLINE, DeliveryType.RECOJO);
        order.markPaid();
        claimed(order);

        service.sendConfirmation(10L);

        ArgumentCaptor<OrderConfirmationMail> captor = ArgumentCaptor.forClass(OrderConfirmationMail.class);
        verify(mail).sendOrderConfirmationEmail(captor.capture());
        assertThat(captor.getValue().paymentStatus()).isEqualTo("Pagado");
        assertThat(captor.getValue().paymentSummary()).isEqualTo("Pago en línea");
        assertThat(captor.getValue().paidAt()).doesNotContain("Pendiente");
    }
}
