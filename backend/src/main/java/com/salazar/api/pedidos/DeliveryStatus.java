package com.salazar.api.pedidos;

import java.util.Optional;

public enum DeliveryStatus {
    PENDIENTE,
    CONFIRMADO,
    EN_PREPARACION,
    LISTO_PARA_RECOGER,
    LISTO_PARA_ENVIO,
    EN_CAMINO,
    ENTREGADO,
    RECHAZADO,
    CANCELADO,
    FALLIDO;

    public boolean isFinal() {
        return this == ENTREGADO || this == RECHAZADO || this == CANCELADO || this == FALLIDO;
    }

    /** Statuses that cannot be reached without the administrator explaining why. */
    public boolean needsReason() {
        return this == RECHAZADO || this == CANCELADO || this == FALLIDO;
    }

    /** Statuses that give the dishes back to the stock. */
    public boolean releasesStock() {
        return this == RECHAZADO || this == CANCELADO;
    }

    /** The next step of the happy path for the given kind of order. */
    public Optional<DeliveryStatus> forwardFor(DeliveryType type) {
        boolean pickup = type == DeliveryType.RECOJO;
        return switch (this) {
            case PENDIENTE -> Optional.of(CONFIRMADO);
            case CONFIRMADO -> Optional.of(EN_PREPARACION);
            case EN_PREPARACION -> Optional.of(pickup ? LISTO_PARA_RECOGER : LISTO_PARA_ENVIO);
            case LISTO_PARA_RECOGER -> Optional.of(ENTREGADO);
            case LISTO_PARA_ENVIO -> Optional.of(EN_CAMINO);
            case EN_CAMINO -> Optional.of(ENTREGADO);
            default -> Optional.empty();
        };
    }

    public boolean canMoveTo(DeliveryStatus to, DeliveryType type) {
        if (isFinal() || to == this) {
            return false;
        }
        if (forwardFor(type).filter(to::equals).isPresent()) {
            return true;
        }
        return switch (to) {
            case RECHAZADO -> this == PENDIENTE;
            case CANCELADO -> this != EN_CAMINO;
            case FALLIDO -> this == LISTO_PARA_RECOGER || this == EN_CAMINO;
            default -> false;
        };
    }

    /** Milestones the customer is told about by email. The kitchen-only and negative statuses are not. */
    public boolean notifiesCustomer(DeliveryType type) {
        return switch (this) {
            case CONFIRMADO, EN_PREPARACION, ENTREGADO -> true;
            case LISTO_PARA_RECOGER -> type == DeliveryType.RECOJO;
            case EN_CAMINO -> type == DeliveryType.ENTREGA;
            default -> false;
        };
    }
}
