package com.salazar.api.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record ProductRequest(
        @NotBlank(message = "El nombre es obligatorio.") @Size(max = 150, message = "El nombre es demasiado largo.")
                String name,
        @NotBlank(message = "La descripción es obligatoria.")
                @Size(max = 1000, message = "La descripción es demasiado larga.")
                String description,
        @NotNull(message = "El precio es obligatorio.")
                @DecimalMin(value = "0", message = "El precio no puede ser negativo.")
                @DecimalMax(value = "9999.99", message = "El precio es demasiado alto.")
                @Digits(integer = 4, fraction = 2, message = "El precio admite hasta dos decimales.")
                BigDecimal price,
        @NotNull(message = "La categoría es obligatoria.") Long categoryId,
        @NotNull(message = "El stock es obligatorio.")
                @Min(value = 0, message = "El stock no puede ser negativo.")
                @Max(value = 9999, message = "El stock es demasiado alto.")
                Integer stock,
        @NotNull Boolean active,
        @NotNull Boolean available,
        @NotNull(message = "Agrega al menos una imagen.")
                @Size(min = 1, max = 5, message = "Un plato lleva de 1 a 5 imágenes.")
                List<@Valid @NotNull ImageEntry> images) {
    public ProductRequest {
        name = name == null ? null : name.strip();
        description = description == null ? null : description.strip();
    }

    /** One slot of the final image list: either a kept image (id) or an uploaded file (index into the files part). */
    public record ImageEntry(Long id, Integer file) {}
}
