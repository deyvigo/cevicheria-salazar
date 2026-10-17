package com.salazar.api.common.exception;

import lombok.Getter;

@Getter
public class FieldInvalidException extends RuntimeException {
    private final String field;

    public FieldInvalidException(String field, String message) {
        super(message);
        this.field = field;
    }
}
