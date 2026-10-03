package com.salazar.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * A diferencia de {@link RegisterRequest}, la contraseña no lleva patrón de
 * complejidad: aquí se verifica una contraseña ya creada, no se crea una nueva.
 */
public record LoginRequest(
        @NotBlank(message = "El correo es obligatorio.") @Email(message = "Ingresa un correo válido.") String email,
        @NotBlank(message = "La contraseña es obligatoria.") String password) {

    public LoginRequest {
        email = email == null ? null : email.trim().toLowerCase();
    }

    @Override
    public String toString() {
        return "LoginRequest[email=%s, password=***]".formatted(email);
    }
}
