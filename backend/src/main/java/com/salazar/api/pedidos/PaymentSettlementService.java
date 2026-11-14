package com.salazar.api.pedidos;

import com.salazar.api.pedidos.PaymentGateway.GatewayPayment;
import java.math.BigDecimal;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The database half of a payment notification; a separate bean so its transaction really opens. */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentSettlementService {
    private static final String CURRENCY = "PEN";

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ApplicationEventPublisher events;

    @Transactional
    public void apply(GatewayPayment gatewayPayment) {
        Long orderId = parseOrderId(gatewayPayment.externalReference());
        if (orderId == null) {
            log.warn("Payment {} has no usable order reference", gatewayPayment.id());
            return;
        }
        // Row lock: two notifications for the same order are processed one after the other
        Order order = orderRepository.findByIdForUpdate(orderId).orElse(null);
        if (order == null) {
            log.warn("Payment {} points to unknown order {}", gatewayPayment.id(), orderId);
            return;
        }

        Optional<Payment> existing = paymentRepository.findByProviderAndProviderPaymentId(
                Payment.PROVIDER_MERCADOPAGO, gatewayPayment.id());
        boolean known = existing.isPresent();
        Payment payment = existing.orElseGet(() -> new Payment(
                        orderId,
                        gatewayPayment.id(),
                        gatewayPayment.status(),
                        gatewayPayment.statusDetail(),
                        gatewayPayment.amount() == null ? BigDecimal.ZERO : gatewayPayment.amount()));
        payment.update(gatewayPayment.status(), gatewayPayment.statusDetail());

        if (payment.isApproved()) {
            settleApproved(order, payment, gatewayPayment, known);
        }
        paymentRepository.save(payment);
    }

    private void settleApproved(Order order, Payment payment, GatewayPayment gatewayPayment, boolean known) {
        boolean amountMatches = gatewayPayment.amount() != null
                && gatewayPayment.amount().compareTo(order.getTotal()) == 0
                && CURRENCY.equals(gatewayPayment.currency());
        if (order.isPending() && amountMatches) {
            order.markPaid();
            events.publishEvent(new OrderChangedEvent(OrderChangedEvent.Type.CREATED, order.getId()));
        } else if (order.getStatus() == OrderStatus.PAGADO && known) {
            // A repeated notification for the payment that already paid the order: nothing to do
            return;
        } else {
            // Paid late (order already cancelled), paid twice, or for a different amount: a person has to look at it
            payment.flagForReview();
            log.warn(
                    "Payment {} approved but order {} is {} (amount matches: {}); flagged for review",
                    gatewayPayment.id(),
                    order.getId(),
                    order.getStatus(),
                    amountMatches);
        }
    }

    private Long parseOrderId(String reference) {
        try {
            return reference == null ? null : Long.valueOf(reference);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
