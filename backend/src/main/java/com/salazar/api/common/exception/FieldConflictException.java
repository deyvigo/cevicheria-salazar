package com.salazar.api.common.exception;

import lombok.Getter;

/**
 * Un valor único (correo, etc.) ya existe. Genérica a propósito: cualquier
 * historia futura con el mismo problema (ej. otro campo único) la reutiliza
 * en vez de agregar un handler nuevo en {@link ApiExceptionHandler}.
 */
@Getter
public class FieldConflictException extends RuntimeException {

    private final String field;

    public FieldConflictException(String field, String message) {
        super(message);
        this.field = field;
    }
}
