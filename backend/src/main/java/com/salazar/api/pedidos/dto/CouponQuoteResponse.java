package com.salazar.api.pedidos.dto;

import java.math.BigDecimal;

public record CouponQuoteResponse(String code, BigDecimal discount, BigDecimal subtotal) {}
