package com.salazar.api.common.exception;

public class ReviewNotFoundException extends RuntimeException {
    public ReviewNotFoundException() {
        super("No encontramos tu reseña.");
    }
}
