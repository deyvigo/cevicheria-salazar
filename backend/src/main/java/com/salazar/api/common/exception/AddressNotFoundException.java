package com.salazar.api.common.exception;

public class AddressNotFoundException extends RuntimeException {
    public AddressNotFoundException() {
        super("No encontramos esta dirección.");
    }
}
