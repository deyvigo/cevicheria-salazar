package com.salazar.api.pedidos;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class OrderConfirmationListener {
    private final OrderConfirmationService confirmationService;

    // After commit so a rolled-back confirmation never sends mail; async so the response and the payment webhook don't wait for SMTP
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderConfirmed(OrderConfirmedEvent event) {
        confirmationService.sendConfirmation(event.orderId());
    }
}
