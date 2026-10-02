package com.salazar.api.common.exception;

import java.time.Instant;
import java.util.List;

/** Forma de respuesta uniforme para todos los errores de la API. */
public record ApiError(Instant timestamp, int status, String error, List<FieldError> fieldErrors, String message) {

    public record FieldError(String field, String message) {}

    public static ApiError of(int status, String error, String message) {
        return new ApiError(Instant.now(), status, error, List.of(), message);
    }

    public static ApiError ofFieldErrors(int status, String error, List<FieldError> fieldErrors) {
        return new ApiError(Instant.now(), status, error, fieldErrors, "Hay datos inválidos en la solicitud.");
    }
}
