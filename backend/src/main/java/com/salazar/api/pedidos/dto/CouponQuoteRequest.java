package com.salazar.api.pedidos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CouponQuoteRequest(
        @NotBlank(message = "Ingresa un código.") @Size(max = 30, message = "Este código no es válido.") String code,
        @NotEmpty(message = "Tu carrito está vacío.") @Size(max = 50, message = "Hay demasiados platos en el pedido.")
                List<CreateOrderRequest.@Valid @NotNull(message = "El plato no es válido.") Item> items) {}
