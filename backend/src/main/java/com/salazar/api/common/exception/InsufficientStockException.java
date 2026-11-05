package com.salazar.api.common.exception;

public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(String productName, int available) {
        super("«" + productName + "» solo tiene " + available + " disponible" + (available == 1 ? "" : "s") + ".");
    }
}
