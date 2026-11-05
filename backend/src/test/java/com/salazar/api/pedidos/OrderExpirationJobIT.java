package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class OrderExpirationJobIT extends OrderITSupport {
    @Autowired
    private OrderExpirationJob job;

    private long placed(Customer customer, long dish, int quantity) throws Exception {
        return createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, quantity}));
    }

    private void expiresMinutesAgo(long orderId, int minutes) {
        jdbcTemplate.update(
                "UPDATE orders SET expires_at = now() - make_interval(mins => ?) WHERE id = ?", minutes, orderId);
    }

    @Test
    void anOverdueUnpaidOrderIsCancelledAndItsStockReleased() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        long order = placed(customer, dish, 2);
        assertThat(stockOf(dish)).isEqualTo(3);
        expiresMinutesAgo(order, 10);

        int cancelled = job.expireOverdue(Instant.now());

        assertThat(cancelled).isEqualTo(1);
        assertThat(statusOf(order)).isEqualTo("CANCELADO");
        assertThat(stockOf(dish)).isEqualTo(5);
        assertThat(jdbcTemplate.queryForObject("SELECT cancel_reason FROM orders WHERE id = ?", String.class, order))
                .isEqualTo("VENCIDO");
    }

    @Test
    void anOrderStillInsideItsWindowOrItsGraceIsLeftAlone() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        long fresh = placed(customer, dish, 1);
        long inGrace = placed(register(), dish, 1);
        expiresMinutesAgo(inGrace, 1);

        int cancelled = job.expireOverdue(Instant.now());

        assertThat(cancelled).isZero();
        assertThat(statusOf(fresh)).isEqualTo("PENDIENTE_PAGO");
        assertThat(statusOf(inGrace)).isEqualTo("PENDIENTE_PAGO");
        assertThat(stockOf(dish)).isEqualTo(3);
    }

    @Test
    void aPaidOrderIsNeverExpired() throws Exception {
        Customer customer = register();
        long dish = product("Ceviche " + UUID.randomUUID(), "30.00", 5);
        long order = placed(customer, dish, 2);
        jdbcTemplate.update("UPDATE orders SET status = 'PAGADO', paid_at = now() WHERE id = ?", order);
        expiresMinutesAgo(order, 60);

        int cancelled = job.expireOverdue(Instant.now());

        assertThat(cancelled).isZero();
        assertThat(statusOf(order)).isEqualTo("PAGADO");
        assertThat(stockOf(dish)).isEqualTo(3);
    }
}
