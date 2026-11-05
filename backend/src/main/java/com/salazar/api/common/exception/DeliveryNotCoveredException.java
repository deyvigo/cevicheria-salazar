package com.salazar.api.common.exception;

public class DeliveryNotCoveredException extends RuntimeException {
    public DeliveryNotCoveredException() {
        super("Tu dirección no está en cobertura. Elige otra dirección o recoge en tienda.");
    }
}
