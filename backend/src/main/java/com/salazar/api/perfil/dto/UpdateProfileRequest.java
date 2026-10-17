package com.salazar.api.perfil.dto;

import com.salazar.api.auth.dto.PhoneRules;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "El nombre es obligatorio.") @Size(max = 80, message = "El nombre es demasiado largo.")
                String firstName,
        @NotBlank(message = "El apellido es obligatorio.") @Size(max = 80, message = "El apellido es demasiado largo.")
                String lastName,
        @NotBlank(message = "El teléfono es obligatorio.") @Pattern(regexp = PhoneRules.REGEXP, message = PhoneRules.MESSAGE)
                String phone) {
    public UpdateProfileRequest {
        firstName = firstName == null ? null : firstName.trim();
        lastName = lastName == null ? null : lastName.trim();
        phone = phone == null ? null : phone.trim();
    }
}
