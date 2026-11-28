package com.salazar.api.admin.dto;

import com.salazar.api.pedidos.DiscountType;
import java.math.BigDecimal;
import java.time.LocalDate;

public record AdminCouponResponse(
        Long id,
        String code,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal minSubtotal,
        Integer maxUses,
        Integer maxUsesPerCustomer,
        LocalDate startsOn,
        LocalDate endsOn,
        boolean active,
        long uses,
        boolean hasOrders,
        boolean exhausted,
        boolean expired) {}
