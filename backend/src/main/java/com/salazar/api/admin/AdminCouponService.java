package com.salazar.api.admin;

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
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminCouponService {
    static final ZoneId LIMA = ZoneId.of("America/Lima");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final String CODE_TAKEN = "Ya existe un cupón con este código.";
    private static final String CODE_LOCKED = "El código no se puede cambiar porque ya se usó.";

    private final CouponRepository couponRepository;

    @Transactional(readOnly = true)
    public List<AdminCouponResponse> list() {
        Map<Long, CouponRepository.Usage> usage = couponRepository.usage().stream()
                .collect(Collectors.toMap(CouponRepository.Usage::getCouponId, Function.identity()));
        Instant now = Instant.now();
        return couponRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
                .map(coupon -> {
                    CouponRepository.Usage row = usage.get(coupon.getId());
                    long uses = row == null ? 0 : row.getUses();
                    boolean hasOrders = row != null && row.getOrders() > 0;
                    return toResponse(coupon, uses, hasOrders, now);
                })
                .toList();
    }

    @Transactional
    public AdminCouponResponse create(CouponRequest request) {
        validate(request);
        if (couponRepository.existsByCode(request.code())) throw new FieldConflictException("code", CODE_TAKEN);
        Coupon coupon = new Coupon(
                request.code(),
                request.discountType(),
                request.discountValue(),
                request.minSubtotal(),
                startOf(request.startsOn()),
                endOf(request.endsOn()),
                request.maxUses(),
                request.maxUsesPerCustomer());
        coupon.setActive(request.active());
        save(coupon);
        return toResponse(coupon, 0, false, Instant.now());
    }

    @Transactional
    public AdminCouponResponse update(Long id, CouponRequest request) {
        validate(request);
        // Same row lock that order creation takes, so a purchase cannot slip between these checks and the save
        Coupon coupon = couponRepository.findByIdForUpdate(id).orElseThrow(CouponNotFoundException::new);
        boolean hasOrders = couponRepository.hasOrders(id);
        if (!coupon.getCode().equals(request.code())) {
            if (hasOrders) throw new FieldInvalidException("code", CODE_LOCKED);
            if (couponRepository.existsByCodeAndIdNot(request.code(), id)) {
                throw new FieldConflictException("code", CODE_TAKEN);
            }
        }
        long uses = couponRepository.countUses(id);
        if (request.maxUses() != null && request.maxUses() < uses) {
            throw new FieldInvalidException("maxUses", usedTimes(uses) + ": los cupos no pueden ser menos.");
        }
        coupon.update(
                request.code(),
                request.discountType(),
                request.discountValue(),
                request.minSubtotal(),
                startOf(request.startsOn()),
                endOf(request.endsOn()),
                request.maxUses(),
                request.maxUsesPerCustomer(),
                request.active());
        save(coupon);
        return toResponse(coupon, uses, hasOrders, Instant.now());
    }

    @Transactional
    public AdminCouponResponse setActive(Long id, boolean active) {
        Coupon coupon = couponRepository.findByIdForUpdate(id).orElseThrow(CouponNotFoundException::new);
        coupon.setActive(active);
        couponRepository.saveAndFlush(coupon);
        return toResponse(coupon, couponRepository.countUses(id), couponRepository.hasOrders(id), Instant.now());
    }

    @Transactional
    public void delete(Long id) {
        Coupon coupon = couponRepository.findByIdForUpdate(id).orElseThrow(CouponNotFoundException::new);
        if (couponRepository.hasOrders(id)) throw new CouponInUseException();
        try {
            couponRepository.delete(coupon);
            couponRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            // orders.coupon_id is the last line of defense if an order appeared after the check
            throw new CouponInUseException();
        }
    }

    private static void validate(CouponRequest request) {
        if (request.discountType() == DiscountType.PERCENTAGE && request.discountValue().compareTo(HUNDRED) > 0) {
            throw new FieldInvalidException("discountValue", "El porcentaje no puede ser mayor que 100.");
        }
        if (request.startsOn() != null && request.endsOn() != null && request.endsOn().isBefore(request.startsOn())) {
            throw new FieldInvalidException("endsOn", "La fecha de fin no puede ser anterior a la de inicio.");
        }
    }

    private static String usedTimes(long uses) {
        return uses == 1 ? "Ya se usó 1 vez" : "Ya se usó " + uses + " veces";
    }

    static Instant startOf(LocalDate day) {
        return day == null ? null : day.atStartOfDay(LIMA).toInstant();
    }

    // The checkout treats ends_at as exclusive, so the last day is valid until the next midnight in Lima
    static Instant endOf(LocalDate day) {
        return day == null ? null : day.plusDays(1).atStartOfDay(LIMA).toInstant();
    }

    private static LocalDate startDay(Instant startsAt) {
        return startsAt == null ? null : LocalDate.ofInstant(startsAt, LIMA);
    }

    private static LocalDate endDay(Instant endsAt) {
        return endsAt == null ? null : LocalDate.ofInstant(endsAt.minusNanos(1), LIMA);
    }

    private void save(Coupon coupon) {
        try {
            couponRepository.saveAndFlush(coupon);
        } catch (DataIntegrityViolationException ex) {
            // Two requests passed the availability check at once; the unique constraint decides
            throw new FieldConflictException("code", CODE_TAKEN);
        }
    }

    private static AdminCouponResponse toResponse(Coupon coupon, long uses, boolean hasOrders, Instant now) {
        boolean exhausted = coupon.getMaxUses() != null && uses >= coupon.getMaxUses();
        boolean expired = coupon.getEndsAt() != null && !now.isBefore(coupon.getEndsAt());
        return new AdminCouponResponse(
                coupon.getId(),
                coupon.getCode(),
                coupon.getDiscountType(),
                coupon.getDiscountValue(),
                coupon.getMinSubtotal(),
                coupon.getMaxUses(),
                coupon.getMaxUsesPerCustomer(),
                startDay(coupon.getStartsAt()),
                endDay(coupon.getEndsAt()),
                coupon.isActive(),
                uses,
                hasOrders,
                exhausted,
                expired);
    }
}
