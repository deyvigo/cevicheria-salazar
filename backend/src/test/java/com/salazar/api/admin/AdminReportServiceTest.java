package com.salazar.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.salazar.api.admin.dto.SalesReport.Granularity;
import com.salazar.api.admin.dto.SalesReport.PaymentShare;
import com.salazar.api.admin.dto.SalesReport.Period;
import com.salazar.api.common.exception.FieldInvalidException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdminReportServiceTest {
    private final AdminReportService service = new AdminReportService(null);

    private static BigDecimal money(String value) {
        return new BigDecimal(value);
    }

    @Test
    void choosesTheGranularityFromTheNumberOfDays() {
        assertThat(AdminReportService.granularity(1)).isEqualTo(Granularity.DAY);
        assertThat(AdminReportService.granularity(31)).isEqualTo(Granularity.DAY);
        assertThat(AdminReportService.granularity(32)).isEqualTo(Granularity.WEEK);
        assertThat(AdminReportService.granularity(120)).isEqualTo(Granularity.WEEK);
        assertThat(AdminReportService.granularity(121)).isEqualTo(Granularity.MONTH);
        assertThat(AdminReportService.granularity(366)).isEqualTo(Granularity.MONTH);
    }

    @Test
    void rejectsMissingAndInvalidRanges() {
        LocalDate day = LocalDate.of(2026, 11, 10);
        assertThatThrownBy(() -> service.sales(null, day, null, null)).isInstanceOf(FieldInvalidException.class);
        assertThatThrownBy(() -> service.sales(day, null, null, null)).isInstanceOf(FieldInvalidException.class);
        assertThatThrownBy(() -> service.sales(day, day.minusDays(1), null, null))
                .isInstanceOf(FieldInvalidException.class);
        assertThatThrownBy(() -> service.sales(day, day.plusDays(366), null, null))
                .isInstanceOf(FieldInvalidException.class);
    }

    @Test
    void averagesWithHalfUpAndZeroWithoutOrders() {
        assertThat(AdminReportService.average(money("100.00"), 3)).isEqualByComparingTo("33.33");
        assertThat(AdminReportService.average(money("10.00"), 8)).isEqualByComparingTo("1.25");
        assertThat(AdminReportService.average(money("0.00"), 0)).isEqualByComparingTo("0.00");
        assertThat(AdminReportService.average(money("0.00"), 0).scale()).isEqualTo(2);
    }

    @Test
    void fillsEveryDayWithZerosWhereNothingWasSold() {
        LocalDate from = LocalDate.of(2026, 11, 1);
        List<Period> periods = AdminReportService.fill(
                Granularity.DAY,
                from,
                from.plusDays(3),
                List.of(new AdminReportQuery.Bucket(from.plusDays(1), money("40.00"), 2)));

        assertThat(periods).extracting(Period::date).containsExactly(from, from.plusDays(1), from.plusDays(2), from.plusDays(3));
        assertThat(periods).extracting(Period::revenue).extracting(BigDecimal::toPlainString)
                .containsExactly("0.00", "40.00", "0.00", "0.00");
        assertThat(periods).extracting(Period::orders).containsExactly(0L, 2L, 0L, 0L);
    }

    @Test
    void weeksStartOnTheMondayThatContainsTheFirstDay() {
        // 2026-11-04 is a Wednesday: the first week starts on Monday 2026-11-02
        List<Period> periods = AdminReportService.fill(Granularity.WEEK, LocalDate.of(2026, 11, 4), LocalDate.of(2026, 12, 20), List.of());

        assertThat(periods.get(0).date()).isEqualTo(LocalDate.of(2026, 11, 2));
        assertThat(periods.get(1).date()).isEqualTo(LocalDate.of(2026, 11, 9));
        assertThat(periods.getLast().date()).isEqualTo(LocalDate.of(2026, 12, 14));
    }

    @Test
    void monthsStartOnTheFirstDay() {
        List<Period> periods = AdminReportService.fill(Granularity.MONTH, LocalDate.of(2026, 1, 15), LocalDate.of(2026, 4, 2), List.of());

        assertThat(periods).extracting(Period::date).containsExactly(
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 1), LocalDate.of(2026, 4, 1));
    }

    @Test
    void sharesAlwaysListTheThreeMethodsAndAddUpToOneHundred() {
        List<PaymentShare> thirds = AdminReportService.shares(List.of(
                new AdminReportQuery.MethodTotal("ONLINE", money("10.00"), 1),
                new AdminReportQuery.MethodTotal("EFECTIVO", money("10.00"), 1),
                new AdminReportQuery.MethodTotal("YAPE", money("10.00"), 1)));

        assertThat(thirds).extracting(PaymentShare::method).containsExactly("ONLINE", "EFECTIVO", "YAPE");
        assertThat(thirds.stream().map(PaymentShare::percentage).reduce(BigDecimal.ZERO, BigDecimal::add))
                .isEqualByComparingTo("100.0");
        assertThat(thirds).extracting(share -> share.percentage().toPlainString()).containsExactly("33.4", "33.3", "33.3");
    }

    @Test
    void sharesOfAMissingMethodAreZero() {
        List<PaymentShare> shares = AdminReportService.shares(List.of(new AdminReportQuery.MethodTotal("YAPE", money("50.00"), 2)));

        assertThat(shares).extracting(PaymentShare::orders).containsExactly(0L, 0L, 2L);
        assertThat(shares).extracting(share -> share.percentage().toPlainString()).containsExactly("0.0", "0.0", "100.0");
        assertThat(shares.get(0).revenue()).isEqualByComparingTo("0.00");
    }

    @Test
    void sharesAreAllZeroWithoutSales() {
        List<PaymentShare> shares = AdminReportService.shares(List.of());

        assertThat(shares).hasSize(3);
        assertThat(shares).allSatisfy(share -> assertThat(share.percentage()).isEqualByComparingTo("0.0"));
    }
}
