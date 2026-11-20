package com.salazar.api.pedidos;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class OrderDeliveryNotificationListener {
    private final OrderStatusNotificationService notifications;

    // After commit so a rolled-back change never sends mail; async so the admin's request doesn't wait for SMTP
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onDeliveryChanged(OrderDeliveryChangedEvent event) {
        notifications.notifyStatus(event.orderId(), event.status());
    }
}
