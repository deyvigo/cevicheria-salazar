package com.salazar.api.admin.dto;

import jakarta.validation.constraints.NotNull;

public record CouponActiveRequest(@NotNull(message = "Indica si el cupón está activo.") Boolean active) {}
