package com.salazar.api.common.exception;

public class ProductNotFoundException extends RuntimeException {
    public ProductNotFoundException() {
        super("No encontramos este plato.");
    }
}
