package com.salazar.api.admin.dto;

import com.salazar.api.pedidos.DeliveryStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeDeliveryRequest(@NotNull DeliveryStatus from, @NotNull DeliveryStatus to, String reason, String deliveryCode) {}
