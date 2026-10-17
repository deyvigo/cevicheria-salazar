package com.salazar.api.common.exception;

public class AddressLimitReachedException extends RuntimeException {
    public AddressLimitReachedException(int max) {
        super("Alcanzaste el máximo de " + max + " direcciones guardadas.");
    }
}
