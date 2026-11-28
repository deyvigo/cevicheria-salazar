package com.salazar.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.admin.dto.AdminCouponResponse;
import com.salazar.api.admin.dto.CouponRequest;
import com.salazar.api.common.exception.CouponInUseException;
import com.salazar.api.common.exception.CouponNotFoundException;
import com.salazar.api.common.exception.FieldConflictException;
import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.pedidos.Coupon;
import com.salazar.api.pedidos.CouponRepository;
import com.salazar.api.pedidos.DiscountType;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class AdminCouponServiceTest {
    @Mock
    private CouponRepository couponRepository;

    private AdminCouponService service() {
        return new AdminCouponService(couponRepository);
    }

    private static CouponRequest request(String code, Integer maxUses, LocalDate startsOn, LocalDate endsOn) {
        return new CouponRequest(
                code, DiscountType.PERCENTAGE, new BigDecimal("10"), null, maxUses, 1, startsOn, endsOn, true);
    }

    private static Coupon coupon(String code, Integer maxUses, Instant endsAt) {
        return new Coupon(code, DiscountType.FIXED, new BigDecimal("5.00"), null, null, endsAt, maxUses, null);
    }

    @Test
    void datesAreWholeDaysInLimaWithAnExclusiveEnd() {
        LocalDate start = LocalDate.of(2026, 12, 1);
        LocalDate end = LocalDate.of(2026, 12, 31);

        AdminCouponResponse response = service().create(request("NAVIDAD", null, start, end));

        ArgumentCaptor<Coupon> saved = ArgumentCaptor.forClass(Coupon.class);
        verify(couponRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getStartsAt()).isEqualTo(Instant.parse("2026-12-01T05:00:00Z"));
        assertThat(saved.getValue().getEndsAt()).isEqualTo(Instant.parse("2027-01-01T05:00:00Z"));
        assertThat(response.startsOn()).isEqualTo(start);
        assertThat(response.endsOn()).isEqualTo(end);
        assertThat(response.uses()).isZero();
        assertThat(response.hasOrders()).isFalse();
    }

    @Test
    void createCanStartInactive() {
        var request = new CouponRequest(
                "PRONTO", DiscountType.FIXED, new BigDecimal("5"), null, null, null, null, null, false);

        assertThat(service().create(request).active()).isFalse();
    }

    @Test
    void createRejectsATakenCode() {
        when(couponRepository.existsByCode("CEVICHE10")).thenReturn(true);

        assertThatThrownBy(() -> service().create(request("CEVICHE10", null, null, null)))
                .isInstanceOf(FieldConflictException.class)
                .hasMessage("Ya existe un cupón con este código.");
        verify(couponRepository, never()).saveAndFlush(any());
    }

    @Test
    void aRaceOnTheUniqueCodeEndsAsAConflictOnTheCode() {
        when(couponRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> service().create(request("CEVICHE10", null, null, null)))
                .isInstanceOfSatisfying(FieldConflictException.class, ex -> assertThat(ex.getField()).isEqualTo("code"));
    }

    @Test
    void rejectsAPercentageOver100AndAnEndBeforeTheStart() {
        var percentage = new CouponRequest(
                "MUCHO", DiscountType.PERCENTAGE, new BigDecimal("120"), null, null, null, null, null, true);
        assertThatThrownBy(() -> service().create(percentage))
                .isInstanceOfSatisfying(
                        FieldInvalidException.class, ex -> assertThat(ex.getField()).isEqualTo("discountValue"));

        var dates = request("FECHAS", null, LocalDate.of(2026, 12, 10), LocalDate.of(2026, 12, 9));
        assertThatThrownBy(() -> service().create(dates))
                .isInstanceOfSatisfying(FieldInvalidException.class, ex -> assertThat(ex.getField()).isEqualTo("endsOn"));
    }

    @Test
    void theCodeCanChangeUntilTheCouponHasOrders() {
        when(couponRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(coupon("VIEJO", null, null)));
        when(couponRepository.hasOrders(7L)).thenReturn(false);

        assertThat(service().update(7L, request("NUEVO", null, null, null)).code()).isEqualTo("NUEVO");

        when(couponRepository.hasOrders(7L)).thenReturn(true);
        assertThatThrownBy(() -> service().update(7L, request("OTRO", null, null, null)))
                .isInstanceOfSatisfying(FieldInvalidException.class, ex -> {
                    assertThat(ex.getField()).isEqualTo("code");
                    assertThat(ex.getMessage()).isEqualTo("El código no se puede cambiar porque ya se usó.");
                });
    }

    @Test
    void theSeatsCannotGoBelowTheUses() {
        when(couponRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(coupon("CUPOS", 50, null)));
        when(couponRepository.hasOrders(7L)).thenReturn(true);
        when(couponRepository.countUses(7L)).thenReturn(12L);

        assertThatThrownBy(() -> service().update(7L, request("CUPOS", 11, null, null)))
                .isInstanceOfSatisfying(FieldInvalidException.class, ex -> {
                    assertThat(ex.getField()).isEqualTo("maxUses");
                    assertThat(ex.getMessage()).isEqualTo("Ya se usó 12 veces: los cupos no pueden ser menos.");
                });

        AdminCouponResponse response = service().update(7L, request("CUPOS", 12, null, null));
        assertThat(response.uses()).isEqualTo(12);
        assertThat(response.exhausted()).isTrue();
    }

    @Test
    void listMarksExhaustedAndExpiredCouponsAndCountsOnlyLiveUses() {
        Coupon full = coupon("LLENO", 2, null);
        Coupon old = coupon("VENCIDO", null, Instant.now().minusSeconds(60));
        when(couponRepository.findAllByOrderByCreatedAtDescIdDesc()).thenReturn(List.of(full, old));
        when(couponRepository.usage()).thenReturn(List.of());

        List<AdminCouponResponse> coupons = service().list();

        assertThat(coupons).extracting(AdminCouponResponse::code).containsExactly("LLENO", "VENCIDO");
        assertThat(coupons.get(0).exhausted()).isFalse();
        assertThat(coupons.get(1).expired()).isTrue();
    }

    @Test
    void onlyACouponWithoutOrdersCanBeDeleted() {
        Coupon unused = coupon("SINUSO", null, null);
        when(couponRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(unused));
        when(couponRepository.hasOrders(1L)).thenReturn(false);
        service().delete(1L);
        verify(couponRepository).delete(unused);

        when(couponRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(coupon("USADO", null, null)));
        when(couponRepository.hasOrders(2L)).thenReturn(true);
        assertThatThrownBy(() -> service().delete(2L))
                .isInstanceOf(CouponInUseException.class)
                .hasMessage("Tiene pedidos asociados: desactívalo en su lugar.");
    }

    @Test
    void anUnknownCouponIsNotFound() {
        when(couponRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().setActive(99L, false)).isInstanceOf(CouponNotFoundException.class);
        assertThatThrownBy(() -> service().delete(99L)).isInstanceOf(CouponNotFoundException.class);
    }
}
