package com.salazar.api.common.exception;

/**
 * Correo inexistente, contraseña incorrecta o cuenta inactiva: las tres
 * producen esta misma excepción a propósito (ver specs/hu-02-iniciar-sesion),
 * para no revelar cuál de ellas ocurrió.
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
