package com.salazar.api.common.exception;

public class ProductUnavailableException extends RuntimeException {
    public ProductUnavailableException(String productName) {
        super("«" + productName + "» ya no está disponible.");
    }

    public ProductUnavailableException() {
        super("Uno de los platos de tu pedido ya no está disponible.");
    }
}
