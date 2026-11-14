package com.salazar.api.pedidos;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.common.mail.MailService;
import com.salazar.api.common.mail.OrderConfirmationMail;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Sends the confirmation email of a confirmed order, at most once per order. */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderConfirmationService {
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm", Locale.forLanguageTag("es-PE"))
            .withZone(ZoneId.of("America/Lima"));
    private static final String PAYMENT_PENDING = "Pendiente, se paga al recibir";

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    // Not transactional on purpose: the claim commits on its own and no row lock is held while talking to SMTP
    public void sendConfirmation(Long orderId) {
        try {
            if (orderRepository.claimConfirmationEmail(orderId, Instant.now()) == 0) {
                return;
            }
            Order order = orderRepository.findByIdWithItems(orderId).orElse(null);
            User user = order == null ? null : userRepository.findById(order.getUserId()).orElse(null);
            if (order == null || user == null || !order.isConfirmed()) {
                return;
            }
            mailService.sendOrderConfirmationEmail(toMail(order, user));
        } catch (RuntimeException e) {
            log.error("No se pudo preparar la confirmación del pedido {}", orderId, e);
        }
    }

    OrderConfirmationMail toMail(Order order, User user) {
        boolean pickup = order.getDeliveryType() == DeliveryType.RECOJO;
        List<OrderConfirmationMail.Line> lines = order.getItems().stream()
                .map(item -> new OrderConfirmationMail.Line(
                        item.getProductName(),
                        item.getQuantity(),
                        price(item.getUnitPrice()),
                        price(item.getLineTotal())))
                .toList();
        return new OrderConfirmationMail(
                user.getEmail(),
                user.getFirstName(),
                order.getCode(),
                order.getDeliveryCode(),
                pickup
                        ? "Díselo al personal de la tienda al recoger tu pedido."
                        : "Díselo al repartidor al recibir tu pedido.",
                user.getFirstName() + " " + user.getLastName(),
                order.getStatus() == OrderStatus.PAGADO ? "Pagado" : "Pago pendiente al recibir",
                deliveryStatusLabel(order.getDeliveryStatus()),
                receiving(order, pickup),
                paymentSummary(order, pickup),
                lines,
                price(order.getSubtotal()),
                pickup ? "Recojo en tienda, sin costo" : price(order.getDeliveryPrice()),
                price(order.getTotal()),
                DATE_TIME.format(order.getCreatedAt()),
                order.getPaidAt() == null ? PAYMENT_PENDING : DATE_TIME.format(order.getPaidAt()));
    }

    private String receiving(Order order, boolean pickup) {
        if (pickup) {
            return "Recojo en tienda";
        }
        String reference = order.getAddressReference() == null || order.getAddressReference().isBlank()
                ? ""
                : " (" + order.getAddressReference() + ")";
        return "Entrega a domicilio - " + order.getAddressLabel() + ": " + order.getAddressText() + reference;
    }

    private String paymentSummary(Order order, boolean pickup) {
        if (order.getPaymentMethod() == PaymentMethod.ONLINE) {
            return "Pago en línea";
        }
        String when = pickup ? "al recoger" : "al recibir";
        if (order.getCollectionMethod() == CollectionMethod.YAPE) {
            return "Contraentrega: pagarás con Yape " + when + " tu pedido";
        }
        if (order.getCashAmount() != null) {
            return "Contraentrega: pagarás con " + price(order.getCashAmount()) + " en efectivo (vuelto "
                    + price(order.getChange()) + ")";
        }
        return "Contraentrega: pagarás en efectivo " + when + " tu pedido";
    }

    private String deliveryStatusLabel(DeliveryStatus status) {
        return switch (status) {
            case EN_PREPARACION -> "En preparación";
            case EN_CAMINO -> "En camino";
            case ENTREGADO -> "Entregado";
        };
    }

    private String price(BigDecimal value) {
        return "S/ " + value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
