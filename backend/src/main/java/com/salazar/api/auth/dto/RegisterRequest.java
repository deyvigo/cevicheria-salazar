package com.salazar.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "El correo es obligatorio.") @Email(message = "Ingresa un correo válido.") String email,
        @NotBlank(message = "La contraseña es obligatoria.")
                @Pattern(regexp = PasswordRules.REGEXP, message = PasswordRules.MESSAGE)
                @Size(max = PasswordRules.MAX_LENGTH, message = PasswordRules.MAX_LENGTH_MESSAGE)
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
