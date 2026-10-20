package com.salazar.api.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record DeliveryZoneRequest(
        @NotBlank(message = "El nombre es obligatorio.") @Size(max = 60, message = "El nombre es demasiado largo.")
                String name,
        @NotNull(message = "La tarifa es obligatoria.")
                @DecimalMin(value = "0.01", message = "La tarifa debe ser mayor que 0.")
                @DecimalMax(value = "99.99", message = "La tarifa no puede superar S/ 99.99.")
                @Digits(integer = 2, fraction = 2, message = "Usa hasta 2 decimales.")
                BigDecimal price,
        @NotNull(message = "El color es obligatorio.")
                @Pattern(regexp = "celeste|naranja|lima|aji|coral|grafito", message = "El color no es válido.")
                String color,
        @NotNull(message = "El estado es obligatorio.") Boolean active,
        @NotNull(message = "Dibuja la zona en el mapa.")
                @Size(min = 3, max = 100, message = "La zona debe tener entre 3 y 100 puntos.")
                List<@NotNull @Valid ZoneCoordinate> coordinates) {
    public DeliveryZoneRequest {
        name = name == null ? null : name.strip();
    }
}
