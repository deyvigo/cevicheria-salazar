package com.salazar.api.common.exception;

public class CouponNotFoundException extends RuntimeException {
    public CouponNotFoundException() {
        super("No encontramos este cupón.");
    }
}
