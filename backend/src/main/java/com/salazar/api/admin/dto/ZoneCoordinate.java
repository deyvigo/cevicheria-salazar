package com.salazar.api.admin.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ZoneCoordinate(
        @NotNull(message = "La latitud es obligatoria.")
                @DecimalMin(value = "-90", message = "La latitud no es válida.")
                @DecimalMax(value = "90", message = "La latitud no es válida.")
                BigDecimal latitude,
        @NotNull(message = "La longitud es obligatoria.")
                @DecimalMin(value = "-180", message = "La longitud no es válida.")
                @DecimalMax(value = "180", message = "La longitud no es válida.")
                BigDecimal longitude) {}
