package com.salazar.api.perfil.dto;

import com.salazar.api.auth.dto.PasswordRules;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        String currentPassword,
        @NotBlank(message = "La contraseña es obligatoria.")
                @Pattern(regexp = PasswordRules.REGEXP, message = PasswordRules.MESSAGE)
                @Size(max = PasswordRules.MAX_LENGTH, message = PasswordRules.MAX_LENGTH_MESSAGE)
                String newPassword) {
    @Override
    public String toString() {
        return "ChangePasswordRequest[currentPassword=***, newPassword=***]";
    }
}
