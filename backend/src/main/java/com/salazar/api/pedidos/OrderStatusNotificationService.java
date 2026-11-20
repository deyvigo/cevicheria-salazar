package com.salazar.api.pedidos;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.common.mail.MailService;
import com.salazar.api.common.mail.OrderStatusMail;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Emails the customer when their order reaches one of the milestones in {@link DeliveryStatus#notifiesCustomer}. */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderStatusNotificationService {
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    public void notifyStatus(Long orderId, DeliveryStatus status) {
        try {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null || !status.notifiesCustomer(order.getDeliveryType())) {
                return;
            }
            User user = userRepository.findById(order.getUserId()).orElse(null);
            if (user == null) {
                return;
            }
            mailService.sendOrderStatusEmail(
                    new OrderStatusMail(user.getEmail(), user.getFirstName(), order.getCode(), message(status, order.getDeliveryType())));
        } catch (RuntimeException e) {
            log.error("No se pudo preparar el aviso de estado del pedido {}", orderId, e);
        }
    }

    static String message(DeliveryStatus status, DeliveryType type) {
        boolean pickup = type == DeliveryType.RECOJO;
        return switch (status) {
            case PENDIENTE -> "Recibimos tu pedido, esperando confirmación";
            case CONFIRMADO -> "El restaurante aceptó tu pedido";
            case EN_PREPARACION, LISTO_PARA_ENVIO -> "Estamos preparando tu pedido";
            case LISTO_PARA_RECOGER -> "Tu pedido está listo, puedes pasar a recogerlo";
            case EN_CAMINO -> "Tu pedido va en camino";
            case ENTREGADO -> pickup ? "Pedido recogido, ¡buen provecho!" : "Pedido entregado, ¡buen provecho!";
            case RECHAZADO -> "No pudimos aceptar tu pedido";
            case CANCELADO -> "Tu pedido fue cancelado";
            case FALLIDO -> "No pudimos entregarte el pedido";
        };
    }
}
