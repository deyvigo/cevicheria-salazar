package com.salazar.api.common.exception;

public class TooManyIdsException extends RuntimeException {
    public TooManyIdsException(int max) {
        super("Se pueden consultar como máximo %d platos a la vez.".formatted(max));
    }
}
