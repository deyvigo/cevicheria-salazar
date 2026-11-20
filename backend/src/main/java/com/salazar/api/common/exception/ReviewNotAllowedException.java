package com.salazar.api.common.exception;

public class ReviewNotAllowedException extends RuntimeException {
    public ReviewNotAllowedException() {
        super("Solo puedes reseñar los platos que ya recibiste.");
    }
}
