package com.salazar.api.common.exception;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException() {
        super("No encontramos este pedido.");
    }
}
