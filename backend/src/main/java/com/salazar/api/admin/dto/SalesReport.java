package com.salazar.api.admin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SalesReport(
        Granularity granularity,
        Summary summary,
        List<Period> series,
        List<PaymentShare> byPayment,
        List<Dish> topDishes) {

    public enum Granularity {
        DAY,
        WEEK,
        MONTH
    }

    public record Summary(
            BigDecimal revenue,
            long orders,
            BigDecimal averageTicket,
            BigDecimal discounts,
            BigDecimal pendingCollection,
            PendingRefunds pendingRefunds) {}

    public record PendingRefunds(long count, BigDecimal amount) {}

    /** {@code date} is the first day of the period: the day, the Monday of the week or the first of the month. */
    public record Period(LocalDate date, BigDecimal revenue, long orders) {}

    public record PaymentShare(String method, long orders, BigDecimal revenue, BigDecimal percentage) {}

    public record Dish(String name, long units, BigDecimal revenue) {}
}
