package com.salazar.api.perfil.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.math.RoundingMode;

public record AddressRequest(
        @NotBlank(message = "El nombre es obligatorio.") @Size(max = 40, message = "El nombre es demasiado largo.")
                String label,
        @NotBlank(message = "La dirección es obligatoria.") @Size(max = 200, message = "La dirección es demasiado larga.")
                String address,
        @Size(max = 200, message = "La referencia es demasiado larga.") String reference,
        @NotNull(message = "La latitud es obligatoria.")
                @DecimalMin(value = "-90", message = "La latitud no es válida.")
                @DecimalMax(value = "90", message = "La latitud no es válida.")
                BigDecimal latitude,
        @NotNull(message = "La longitud es obligatoria.")
                @DecimalMin(value = "-180", message = "La longitud no es válida.")
                @DecimalMax(value = "180", message = "La longitud no es válida.")
                BigDecimal longitude) {
    private static final int COORDINATE_SCALE = 6;

    public AddressRequest {
        label = label == null ? null : label.trim();
        address = address == null ? null : address.trim();
        reference = reference == null || reference.isBlank() ? null : reference.trim();
        latitude = latitude == null ? null : latitude.setScale(COORDINATE_SCALE, RoundingMode.HALF_UP);
        longitude = longitude == null ? null : longitude.setScale(COORDINATE_SCALE, RoundingMode.HALF_UP);
    }
}
