package com.salazar.api.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Locale;

public record CategoryRequest(
        @NotBlank(message = "El nombre es obligatorio.") @Size(max = 80, message = "El nombre es demasiado largo.")
                String name,
        @NotBlank(message = "El enlace es obligatorio.")
                @Size(max = 80, message = "El enlace es demasiado largo.")
                @Pattern(
                        regexp = "^[a-z0-9]+(-[a-z0-9]+)*$",
                        message = "Usa solo minúsculas, números y guiones simples.")
                String slug) {
    public CategoryRequest {
        name = name == null ? null : name.strip();
        slug = slug == null ? null : slug.strip().toLowerCase(Locale.ROOT);
    }
}
