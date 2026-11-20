package com.salazar.api.admin;

import com.salazar.api.admin.dto.SalesReport;
import com.salazar.api.admin.dto.SalesReport.Granularity;
import com.salazar.api.admin.dto.SalesReport.PaymentShare;
import com.salazar.api.admin.dto.SalesReport.PendingRefunds;
import com.salazar.api.admin.dto.SalesReport.Period;
import com.salazar.api.admin.dto.SalesReport.Summary;
import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.pedidos.DeliveryType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminReportService {
    static final int MAX_DAYS = 366;
    static final int DAILY_UP_TO_DAYS = 31;
    static final int WEEKLY_UP_TO_DAYS = 120;
    private static final int TOP_DISHES = 10;
    private static final List<String> METHODS = List.of("ONLINE", "EFECTIVO", "YAPE");

    private final AdminReportQuery query;

    @Transactional(readOnly = true)
    public SalesReport sales(LocalDate from, LocalDate to, AdminOrderFilter.Payment payment, DeliveryType type) {
        if (from == null) {
            throw new FieldInvalidException("from", "Indica la fecha inicial.");
        }
        if (to == null) {
            throw new FieldInvalidException("to", "Indica la fecha final.");
        }
        if (from.isAfter(to)) {
            throw new FieldInvalidException("from", "La fecha inicial no puede ser posterior a la final.");
        }
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > MAX_DAYS) {
            throw new FieldInvalidException("to", "El rango no puede superar los 366 días.");
        }
        Granularity granularity = granularity(days);
        AdminReportQuery.Filters filters = new AdminReportQuery.Filters(from, to, payment, type);

        AdminReportQuery.SalesTotals totals = query.totals(filters);
        AdminReportQuery.Amount refunds = query.pendingRefunds(filters);
        Summary summary = new Summary(
                totals.revenue(),
                totals.orders(),
                average(totals.revenue(), totals.orders()),
                totals.discounts(),
                query.pendingCollection(filters),
                new PendingRefunds(refunds.count(), refunds.amount()));
        return new SalesReport(
                granularity,
                summary,
                fill(granularity, from, to, query.series(granularity, filters)),
                shares(query.byMethod(filters)),
                query.topDishes(filters, TOP_DISHES));
    }

    static Granularity granularity(long days) {
        if (days <= DAILY_UP_TO_DAYS) {
            return Granularity.DAY;
        }
        return days <= WEEKLY_UP_TO_DAYS ? Granularity.WEEK : Granularity.MONTH;
    }

    static BigDecimal average(BigDecimal revenue, long orders) {
        if (orders == 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return revenue.divide(BigDecimal.valueOf(orders), 2, RoundingMode.HALF_UP);
    }

    /** One entry per period of the range, in order, with zeros where nothing was sold. */
    static List<Period> fill(Granularity granularity, LocalDate from, LocalDate to, List<AdminReportQuery.Bucket> found) {
        Map<LocalDate, AdminReportQuery.Bucket> byDate = new HashMap<>();
        found.forEach(bucket -> byDate.put(bucket.date(), bucket));
        List<Period> periods = new ArrayList<>();
        LocalDate current = switch (granularity) {
            case DAY -> from;
            case WEEK -> from.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> from.withDayOfMonth(1);
        };
        while (!current.isAfter(to)) {
            AdminReportQuery.Bucket bucket = byDate.get(current);
            periods.add(bucket == null
                    ? new Period(current, BigDecimal.ZERO.setScale(2), 0)
                    : new Period(current, bucket.revenue(), bucket.orders()));
            current = switch (granularity) {
                case DAY -> current.plusDays(1);
                case WEEK -> current.plusWeeks(1);
                case MONTH -> current.plusMonths(1);
            };
        }
        return periods;
    }

    /** Always the three methods; the percentages have one decimal and add up to exactly 100.0. */
    static List<PaymentShare> shares(List<AdminReportQuery.MethodTotal> found) {
        Map<String, AdminReportQuery.MethodTotal> byMethod = new HashMap<>();
        found.forEach(total -> byMethod.put(total.method(), total));
        BigDecimal all = found.stream().map(AdminReportQuery.MethodTotal::revenue).reduce(BigDecimal.ZERO, BigDecimal::add);

        long[] tenths = new long[METHODS.size()];
        BigDecimal[] remainders = new BigDecimal[METHODS.size()];
        long assigned = 0;
        for (int i = 0; i < METHODS.size(); i++) {
            AdminReportQuery.MethodTotal total = byMethod.get(METHODS.get(i));
            BigDecimal raw = total == null || all.signum() == 0
                    ? BigDecimal.ZERO
                    : total.revenue().multiply(BigDecimal.valueOf(1000)).divide(all, 10, RoundingMode.DOWN);
            tenths[i] = raw.setScale(0, RoundingMode.DOWN).longValue();
            remainders[i] = raw.subtract(BigDecimal.valueOf(tenths[i]));
            assigned += tenths[i];
        }
        if (all.signum() > 0) {
            // Largest remainder: the leftover tenths go to the methods that lost the most when truncating
            List<Integer> order = new ArrayList<>(List.of(0, 1, 2));
            order.sort(Comparator.comparing((Integer i) -> remainders[i]).reversed());
            for (int k = 0; k < 1000 - assigned; k++) {
                tenths[order.get(k % order.size())]++;
            }
        }
        List<PaymentShare> shares = new ArrayList<>();
        for (int i = 0; i < METHODS.size(); i++) {
            AdminReportQuery.MethodTotal total = byMethod.get(METHODS.get(i));
            shares.add(new PaymentShare(
                    METHODS.get(i),
                    total == null ? 0 : total.orders(),
                    total == null ? BigDecimal.ZERO.setScale(2) : total.revenue(),
                    BigDecimal.valueOf(tenths[i], 1)));
        }
        return shares;
    }
}
