package com.salazar.api.pedidos;

import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderExpirationJob {
    private static final int BATCH_SIZE = 100;

    private final OrderRepository orderRepository;
    private final OrderLifecycleService lifecycle;
    private final OrderProperties properties;

    @Scheduled(fixedDelayString = "${app.orders.expiry-check-interval:60s}")
    public void cancelExpired() {
        expireOverdue(Instant.now());
    }

    // The grace period keeps a payment approved right at the deadline from racing against its own cancellation
    int expireOverdue(Instant now) {
        List<Long> ids = orderRepository.findIdsByStatusAndExpiresAtBefore(
                OrderStatus.PENDIENTE_PAGO, now.minus(properties.expiryGrace()), PageRequest.of(0, BATCH_SIZE));
        int cancelled = 0;
        for (Long id : ids) {
            try {
                if (lifecycle.cancelPending(id, OrderLifecycleService.CANCEL_EXPIRED)) {
                    cancelled++;
                }
            } catch (RuntimeException e) {
                log.error("Could not expire order {}", id, e);
            }
        }
        if (cancelled > 0) {
            log.info("Expired {} unpaid orders", cancelled);
        }
        return cancelled;
    }
}
