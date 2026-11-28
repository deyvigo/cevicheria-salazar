package com.salazar.api.common.exception;

public class CouponInUseException extends RuntimeException {
    public CouponInUseException() {
        super("Tiene pedidos asociados: desactívalo en su lugar.");
    }
}
