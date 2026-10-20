package com.salazar.api.common.exception;

public class DeliveryZoneNotFoundException extends RuntimeException {
    public DeliveryZoneNotFoundException() {
        super("No encontramos esta zona.");
    }
}
