package com.salazar.api.admin;

import com.salazar.api.pedidos.DeliveryStatus;
import com.salazar.api.pedidos.DeliveryType;
import com.salazar.api.pedidos.OrderStatus;
import com.salazar.api.pedidos.RefundStatus;
import java.time.LocalDate;

public record AdminOrderFilter(
        DeliveryStage stage,
        DeliveryType type,
        Payment payment,
        OrderStatus paymentStatus,
        RefundStatus refund,
        String zone,
        String query,
        LocalDate from,
        LocalDate to) {

    /** "Active" is the default view: orders that are not in a final status yet. */
    public enum DeliveryStage {
        ACTIVE,
        PENDIENTE,
        CONFIRMADO,
        EN_PREPARACION,
        LISTO_PARA_RECOGER,
        LISTO_PARA_ENVIO,
        EN_CAMINO,
        ENTREGADO,
        RECHAZADO,
        CANCELADO,
        FALLIDO,
        ALL;

        DeliveryStatus single() {
            return this == ACTIVE || this == ALL ? null : DeliveryStatus.valueOf(name());
        }
    }

    public enum Payment {
        ONLINE,
        EFECTIVO,
        YAPE
    }
}
