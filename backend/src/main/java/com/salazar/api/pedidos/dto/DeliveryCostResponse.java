package com.salazar.api.pedidos.dto;

import java.math.BigDecimal;

public record DeliveryCostResponse(boolean covered, BigDecimal price, String zone) {
    public static DeliveryCostResponse notCovered() {
        return new DeliveryCostResponse(false, new BigDecimal("0.00"), null);
    }
}
