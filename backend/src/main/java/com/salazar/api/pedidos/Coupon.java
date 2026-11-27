package com.salazar.api.pedidos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "coupons")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Coupon {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 10)
    private DiscountType discountType;

    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "min_subtotal", precision = 10, scale = 2)
    private BigDecimal minSubtotal;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "max_uses_per_customer")
    private Integer maxUsesPerCustomer;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Coupon(
            String code,
            DiscountType discountType,
            BigDecimal discountValue,
            BigDecimal minSubtotal,
            Instant startsAt,
            Instant endsAt,
            Integer maxUses,
            Integer maxUsesPerCustomer) {
        this.code = code;
        this.discountType = discountType;
        this.discountValue = discountValue;
        this.minSubtotal = minSubtotal;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.maxUses = maxUses;
        this.maxUsesPerCustomer = maxUsesPerCustomer;
        this.active = true;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
