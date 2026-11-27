package com.salazar.api.pedidos;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.catalogo.Product;
import com.salazar.api.catalogo.ProductRepository;
import com.salazar.api.common.exception.CouponNotApplicableException;
import com.salazar.api.pedidos.dto.CouponQuoteRequest;
import com.salazar.api.pedidos.dto.CouponQuoteResponse;
import com.salazar.api.pedidos.dto.CreateOrderRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CouponService {
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final CouponRepository couponRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CouponAttemptService attempts;

    public record Applied(Coupon coupon, BigDecimal discount) {}

    public static String normalize(String code) {
        return code == null ? "" : code.strip().toUpperCase(Locale.ROOT);
    }

    /** Informs the discount for the current cart without reserving anything or taking a use. */
    @Transactional(readOnly = true)
    public CouponQuoteResponse quote(Long userId, CouponQuoteRequest request) {
        requireCustomer(userId);
        attempts.checkNotBlocked(userId);
        BigDecimal subtotal = subtotalOf(request);
        try {
            Coupon coupon = couponRepository
                    .findByCode(normalize(request.code()))
                    .orElseThrow(CouponNotApplicableException::notFound);
            BigDecimal discount = evaluate(coupon, subtotal, userId, Instant.now());
            return new CouponQuoteResponse(coupon.getCode(), discount, subtotal);
        } catch (CouponNotApplicableException e) {
            attempts.recordFailure(userId);
            throw e;
        }
    }

    /**
     * Validates the coupon for an order being placed. The coupon row stays locked until the order commits, so
     * concurrent orders see each other's uses and cannot go over the limits.
     */
    public Applied applyForOrder(String code, BigDecimal subtotal, Long userId) {
        Coupon coupon = couponRepository
                .findByCodeForUpdate(normalize(code))
                .orElseThrow(CouponNotApplicableException::notFound);
        return new Applied(coupon, evaluate(coupon, subtotal, userId, Instant.now()));
    }

    BigDecimal evaluate(Coupon coupon, BigDecimal subtotal, Long userId, Instant now) {
        if (!coupon.isActive()) {
            throw CouponNotApplicableException.notFound();
        }
        if (coupon.getStartsAt() != null && now.isBefore(coupon.getStartsAt())) {
            throw CouponNotApplicableException.notStarted();
        }
        if (coupon.getEndsAt() != null && !now.isBefore(coupon.getEndsAt())) {
            throw CouponNotApplicableException.expired();
        }
        if (coupon.getMinSubtotal() != null && subtotal.compareTo(coupon.getMinSubtotal()) < 0) {
            throw CouponNotApplicableException.minSubtotal(coupon.getMinSubtotal());
        }
        if (coupon.getMaxUses() != null && couponRepository.countUses(coupon.getId()) >= coupon.getMaxUses()) {
            throw CouponNotApplicableException.exhausted();
        }
        if (coupon.getMaxUsesPerCustomer() != null
                && couponRepository.countUsesByCustomer(coupon.getId(), userId) >= coupon.getMaxUsesPerCustomer()) {
            throw CouponNotApplicableException.exhausted();
        }
        return discountFor(coupon, subtotal);
    }

    static BigDecimal discountFor(Coupon coupon, BigDecimal subtotal) {
        BigDecimal raw = coupon.getDiscountType() == DiscountType.PERCENTAGE
                ? subtotal.multiply(coupon.getDiscountValue()).divide(HUNDRED, 2, RoundingMode.HALF_UP)
                : coupon.getDiscountValue();
        return raw.min(subtotal).setScale(2, RoundingMode.HALF_UP);
    }

    // Mirrors the cart summary: dishes that can no longer be bought do not count toward the subtotal
    private BigDecimal subtotalOf(CouponQuoteRequest request) {
        Map<Long, Integer> wanted = new LinkedHashMap<>();
        for (CreateOrderRequest.Item item : request.items()) {
            wanted.merge(item.productId(), item.quantity(), Integer::sum);
        }
        BigDecimal subtotal = BigDecimal.ZERO.setScale(2);
        for (Product product : productRepository.findAllByIdInAndActiveTrueAndDeletedAtIsNullOrderByIdAsc(wanted.keySet())) {
            if (product.isAvailable()) {
                subtotal = subtotal.add(product.getPrice().multiply(BigDecimal.valueOf(wanted.get(product.getId()))));
            }
        }
        return subtotal;
    }

    private void requireCustomer(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || !user.isActive()) {
            throw new InsufficientAuthenticationException("Usuario no encontrado.");
        }
        if (user.getRole() != UserRole.CLIENTE) {
            throw new AccessDeniedException("Solo los clientes usan códigos de descuento.");
        }
    }
}
