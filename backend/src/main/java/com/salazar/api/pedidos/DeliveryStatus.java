package com.salazar.api.pedidos;

import java.util.Optional;

public enum DeliveryStatus {
    EN_PREPARACION,
    EN_CAMINO,
    ENTREGADO;

    public Optional<DeliveryStatus> next() {
        return switch (this) {
            case EN_PREPARACION -> Optional.of(EN_CAMINO);
            case EN_CAMINO -> Optional.of(ENTREGADO);
            case ENTREGADO -> Optional.empty();
        };
    }
}
