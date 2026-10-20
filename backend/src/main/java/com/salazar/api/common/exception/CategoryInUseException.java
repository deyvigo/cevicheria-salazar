package com.salazar.api.common.exception;

public class CategoryInUseException extends RuntimeException {
    public CategoryInUseException() {
        super("No se puede eliminar: tiene platos asociados.");
    }
}
