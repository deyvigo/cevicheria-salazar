package com.salazar.api.admin.dto;

import com.salazar.api.pedidos.CouponService;
import com.salazar.api.pedidos.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CouponRequest(
        @NotBlank(message = "El código es obligatorio.")
                @Size(max = 30, message = "El código es demasiado largo.")
                @Pattern(regexp = "^[A-Z0-9_-]*$", message = "Usa solo letras, números, guiones y guiones bajos.")
                String code,
        @NotNull(message = "Elige el tipo de descuento.") DiscountType discountType,
        @NotNull(message = "Ingresa el valor del descuento.")
                @DecimalMin(value = "0.01", message = "El valor debe ser mayor que 0.")
                @Digits(integer = 8, fraction = 2, message = "Usa hasta 2 decimales.")
                BigDecimal discountValue,
        @DecimalMin(value = "0.01", message = "La compra mínima debe ser mayor que 0.")
                @Digits(integer = 8, fraction = 2, message = "Usa hasta 2 decimales.")
                BigDecimal minSubtotal,
        @Positive(message = "Los cupos deben ser un número entero mayor que 0.") Integer maxUses,
        @Positive(message = "Los usos por persona deben ser un número entero mayor que 0.") Integer maxUsesPerCustomer,
        LocalDate startsOn,
        LocalDate endsOn,
        @NotNull(message = "Indica si el cupón está activo.") Boolean active) {
    public CouponRequest {
        // The checkout normalizes the code the same way, so what the admin types is what customers type
        code = code == null ? null : CouponService.normalize(code);
    }
}
