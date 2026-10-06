package com.salazar.api.common.exception;

import lombok.Getter;

@Getter
public class FieldConflictException extends RuntimeException {
    private final String field;

    public FieldConflictException(String field, String message) {
        super(message);
        this.field = field;
    }
}
