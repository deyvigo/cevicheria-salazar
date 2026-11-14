package com.salazar.api.admin;

import com.salazar.api.pedidos.DeliveryStatus;
import com.salazar.api.pedidos.DeliveryType;
import com.salazar.api.pedidos.OrderStatus;
import java.time.LocalDate;

public record AdminOrderFilter(
        DeliveryStage stage,
        DeliveryType type,
        Payment payment,
        OrderStatus paymentStatus,
        String zone,
        String query,
        LocalDate from,
        LocalDate to) {

    /** "Active" is the default view: orders the kitchen or the courier still have to move. */
    public enum DeliveryStage {
        ACTIVE,
        EN_PREPARACION,
        EN_CAMINO,
        ENTREGADO,
        ALL;

        DeliveryStatus single() {
            return switch (this) {
                case EN_PREPARACION -> DeliveryStatus.EN_PREPARACION;
                case EN_CAMINO -> DeliveryStatus.EN_CAMINO;
                case ENTREGADO -> DeliveryStatus.ENTREGADO;
                default -> null;
            };
        }
    }

    public enum Payment {
        ONLINE,
        EFECTIVO,
        YAPE
    }
}
