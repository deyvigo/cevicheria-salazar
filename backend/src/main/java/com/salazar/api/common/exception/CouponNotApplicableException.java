package com.salazar.api.common.exception;

import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.Getter;

@Getter
public class CouponNotApplicableException extends RuntimeException {
    public enum Reason {
        NOT_FOUND,
        EXPIRED,
        NOT_STARTED,
        MIN_SUBTOTAL,
        EXHAUSTED
    }

    private final Reason reason;

    private CouponNotApplicableException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    // Inactive coupons share this message so the response never reveals that a code exists
    public static CouponNotApplicableException notFound() {
        return new CouponNotApplicableException(Reason.NOT_FOUND, "Este código no es válido.");
    }

    public static CouponNotApplicableException expired() {
        return new CouponNotApplicableException(Reason.EXPIRED, "Este código ya venció.");
    }

    public static CouponNotApplicableException notStarted() {
        return new CouponNotApplicableException(Reason.NOT_STARTED, "Este código aún no está disponible.");
    }

    public static CouponNotApplicableException minSubtotal(BigDecimal minSubtotal) {
        return new CouponNotApplicableException(
                Reason.MIN_SUBTOTAL,
                "Este código es válido desde una compra de S/ " + minSubtotal.setScale(2, RoundingMode.UNNECESSARY) + ".");
    }

    public static CouponNotApplicableException exhausted() {
        return new CouponNotApplicableException(Reason.EXHAUSTED, "Ya no puedes usar este código.");
    }
}
