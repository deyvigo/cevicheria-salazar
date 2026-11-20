package com.salazar.api.catalogo.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
        @NotNull(message = "Elige una calificación de 1 a 5.")
                @Min(value = 1, message = "Elige una calificación de 1 a 5.")
                @Max(value = 5, message = "Elige una calificación de 1 a 5.")
                Integer rating,
        @Size(max = 500, message = "El comentario no puede superar los 500 caracteres.") String comment) {}
