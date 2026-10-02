package com.salazar.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * El constructor compacto normaliza (recorta espacios, correo en minúsculas)
 * antes de que corran las validaciones — ver specs/hu-01-registro/spec.md
 * (casos borde) y plan.md.
 */
public record RegisterRequest(
        @NotBlank(message = "El correo es obligatorio.") @Email(message = "Ingresa un correo válido.") String email,
        @NotBlank(message = "La contraseña es obligatoria.")
                @Pattern(
                        regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$",
                        message = "La contraseña debe tener al menos 8 caracteres, con letras y números.")
                @Size(max = 72, message = "La contraseña no puede superar los 72 caracteres.")
                String password,
        @NotBlank(message = "El nombre es obligatorio.") String firstName,
        @NotBlank(message = "El apellido es obligatorio.") String lastName,
        @NotBlank(message = "El teléfono es obligatorio.")
                @Pattern(regexp = "^9[0-9]{8}$", message = "Ingresa un teléfono de 9 dígitos que empiece con 9.")
                String phone) {

    public RegisterRequest {
        email = email == null ? null : email.trim().toLowerCase();
        firstName = firstName == null ? null : firstName.trim();
        lastName = lastName == null ? null : lastName.trim();
        phone = phone == null ? null : phone.trim();
    }

    @Override
    public String toString() {
        return "RegisterRequest[email=%s, firstName=%s, lastName=%s, phone=%s, password=***]"
                .formatted(email, firstName, lastName, phone);
    }
}
