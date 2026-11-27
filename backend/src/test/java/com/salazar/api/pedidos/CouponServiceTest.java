package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.UserRepository;
import com.salazar.api.catalogo.ProductRepository;
import com.salazar.api.common.exception.CouponNotApplicableException;
import com.salazar.api.common.exception.CouponNotApplicableException.Reason;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class CouponServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-27T15:00:00Z");

    private final CouponRepository coupons = mock(CouponRepository.class);
    private final CouponService service = new CouponService(
            coupons, mock(ProductRepository.class), mock(UserRepository.class), mock(CouponAttemptService.class));

    private static Coupon coupon(DiscountType type, String value) {
        return coupon(type, value, null, null, null, null, null);
    }

    private static Coupon coupon(
            DiscountType type, String value, String min, Instant starts, Instant ends, Integer maxUses, Integer perCustomer) {
        Coupon coupon = new Coupon(
                "CODIGO", type, new BigDecimal(value), min == null ? null : new BigDecimal(min), starts, ends, maxUses, perCustomer);
        ReflectionTestUtils.setField(coupon, "id", 7L);
        return coupon;
    }

    private BigDecimal evaluate(Coupon coupon, String subtotal) {
        return service.evaluate(coupon, new BigDecimal(subtotal), 1L, NOW);
    }

    private void assertRejected(Coupon coupon, String subtotal, Reason reason) {
        assertThatThrownBy(() -> evaluate(coupon, subtotal))
                .isInstanceOf(CouponNotApplicableException.class)
                .extracting(e -> ((CouponNotApplicableException) e).getReason())
                .isEqualTo(reason);
    }

    @Test
    void normalizesCaseAndSurroundingSpaces() {
        assertThat(CouponService.normalize("  ceviche10 ")).isEqualTo("CEVICHE10");
        assertThat(CouponService.normalize(null)).isEmpty();
    }

    @Test
    void percentagesAreRoundedToCents() {
        assertThat(evaluate(coupon(DiscountType.PERCENTAGE, "10.00"), "82.50")).isEqualByComparingTo("8.25");
        assertThat(evaluate(coupon(DiscountType.PERCENTAGE, "15.00"), "38.70")).isEqualByComparingTo("5.81");
        assertThat(evaluate(coupon(DiscountType.PERCENTAGE, "100.00"), "38.70")).isEqualByComparingTo("38.70");
    }

    @Test
    void aFixedAmountNeverGoesOverTheSubtotal() {
        assertThat(evaluate(coupon(DiscountType.FIXED, "5.00"), "30.00")).isEqualByComparingTo("5.00");
        assertThat(evaluate(coupon(DiscountType.FIXED, "50.00"), "30.00")).isEqualByComparingTo("30.00");
    }

    @Test
    void anInactiveCouponLooksLikeAnUnknownOne() {
        Coupon coupon = coupon(DiscountType.FIXED, "5.00");
        ReflectionTestUtils.setField(coupon, "active", false);
        assertRejected(coupon, "30.00", Reason.NOT_FOUND);
    }

    @Test
    void validityWindowIsChecked() {
        assertRejected(
                coupon(DiscountType.FIXED, "5.00", null, NOW.plusSeconds(60), null, null, null), "30.00", Reason.NOT_STARTED);
        assertRejected(coupon(DiscountType.FIXED, "5.00", null, null, NOW, null, null), "30.00", Reason.EXPIRED);
        assertThat(evaluate(coupon(DiscountType.FIXED, "5.00", null, NOW, NOW.plusSeconds(60), null, null), "30.00"))
                .isEqualByComparingTo("5.00");
    }

    @Test
    void theMinimumIsMeasuredOnTheSubtotal() {
        Coupon coupon = coupon(DiscountType.FIXED, "5.00", "40.00", null, null, null, null);
        assertThatThrownBy(() -> evaluate(coupon, "39.99"))
                .hasMessage("Este código es válido desde una compra de S/ 40.00.");
        assertThat(evaluate(coupon, "40.00")).isEqualByComparingTo("5.00");
    }

    @Test
    void totalAndPerCustomerLimitsAreChecked() {
        Coupon total = coupon(DiscountType.FIXED, "5.00", null, null, null, 3, null);
        when(coupons.countUses(7L)).thenReturn(3L);
        assertRejected(total, "30.00", Reason.EXHAUSTED);

        Coupon perCustomer = coupon(DiscountType.FIXED, "5.00", null, null, null, null, 1);
        when(coupons.countUsesByCustomer(7L, 1L)).thenReturn(1L);
        assertRejected(perCustomer, "30.00", Reason.EXHAUSTED);

        when(coupons.countUses(7L)).thenReturn(2L);
        when(coupons.countUsesByCustomer(7L, 1L)).thenReturn(0L);
        assertThat(evaluate(total, "30.00")).isEqualByComparingTo("5.00");
        assertThat(evaluate(perCustomer, "30.00")).isEqualByComparingTo("5.00");
    }
}
