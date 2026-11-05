package com.salazar.api.pedidos.dto;

import com.salazar.api.pedidos.DeliveryType;
import com.salazar.api.pedidos.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateOrderRequest(
        @NotEmpty(message = "Tu carrito está vacío.") @Size(max = 50, message = "Hay demasiados platos en el pedido.")
                List<@Valid @NotNull(message = "El plato no es válido.") Item> items,
        @NotNull(message = "El tipo de entrega es obligatorio.") DeliveryType deliveryType,
        Long addressId,
        @NotNull(message = "El método de pago es obligatorio.") PaymentMethod paymentMethod) {
    public record Item(
            @NotNull(message = "El plato es obligatorio.") Long productId,
            @NotNull(message = "La cantidad es obligatoria.")
                    @Min(value = 1, message = "La cantidad debe ser al menos 1.")
                    @Max(value = 999, message = "La cantidad es demasiado alta.")
                    Integer quantity) {}
}
