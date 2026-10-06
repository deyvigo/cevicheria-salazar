package com.salazar.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "El enlace no es válido.") String token,
        @NotBlank(message = "La contraseña es obligatoria.")
                @Pattern(regexp = PasswordRules.REGEXP, message = PasswordRules.MESSAGE)
                @Size(max = PasswordRules.MAX_LENGTH, message = PasswordRules.MAX_LENGTH_MESSAGE)
                String password) {
    @Override
    public String toString() {
        return "ResetPasswordRequest[token=***, password=***]";
    }
}
