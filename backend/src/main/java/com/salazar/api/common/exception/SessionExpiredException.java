package com.salazar.api.common.exception;

/**
 * El refresh token no existe, ya se usó, venció o su cuenta dejó de estar activa:
 * todos producen esta misma excepción a propósito (ver specs/hu-04-mantener-sesion),
 * para no revelar cuál de ellos ocurrió.
 */
public class SessionExpiredException extends RuntimeException {

    public SessionExpiredException(String message) {
        super(message);
    }
}
