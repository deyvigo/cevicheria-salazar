package com.salazar.api.common.exception;

public class CategoryNotFoundException extends RuntimeException {
    public CategoryNotFoundException() {
        super("No encontramos esta categoría.");
    }
}
