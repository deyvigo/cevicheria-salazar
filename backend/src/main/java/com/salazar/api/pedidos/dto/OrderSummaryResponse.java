package com.salazar.api.pedidos.dto;

import com.salazar.api.pedidos.DeliveryStatus;
import com.salazar.api.pedidos.DeliveryType;
import com.salazar.api.pedidos.RefundStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderSummaryResponse(
        Long id,
        String code,
        List<String> itemNames,
        BigDecimal total,
        Instant purchasedAt,
        DeliveryStatus deliveryStatus,
        DeliveryType deliveryType,
        String deliveryReason,
        RefundStatus refundStatus) {}
