package com.salazar.api.common.exception;

/** Se superó el límite de intentos fallidos (ver `LoginAttemptService`). */
public class TooManyAttemptsException extends RuntimeException {

    public TooManyAttemptsException(String message) {
        super(message);
    }
}
