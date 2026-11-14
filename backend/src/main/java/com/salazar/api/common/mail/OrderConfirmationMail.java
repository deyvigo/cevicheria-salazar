package com.salazar.api.common.mail;

import java.util.List;

/** Everything the confirmation email shows, already formatted, so this package knows nothing about orders. */
public record OrderConfirmationMail(
        String to,
        String firstName,
        String orderCode,
        String deliveryCode,
        String deliveryCodeHint,
        String customerName,
        String paymentStatus,
        String deliveryStatus,
        String receiving,
        String paymentSummary,
        List<Line> items,
        String subtotal,
        String delivery,
        String total,
        String purchasedAt,
        String paidAt) {
    public record Line(String name, int quantity, String unitPrice, String lineTotal) {}
}
