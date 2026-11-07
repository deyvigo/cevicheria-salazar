package com.salazar.api.pedidos.dto;

import com.salazar.api.pedidos.DeliveryStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderSummaryResponse(
        Long id,
        String code,
        List<String> itemNames,
        BigDecimal total,
        Instant purchasedAt,
        DeliveryStatus deliveryStatus) {}
