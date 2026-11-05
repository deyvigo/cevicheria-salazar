package com.salazar.api.pedidos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "payments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {
    public static final String PROVIDER_MERCADOPAGO = "MERCADOPAGO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, updatable = false)
    private Long orderId;

    @Column(nullable = false, updatable = false, length = 20)
    private String provider;

    @Column(name = "provider_payment_id", nullable = false, updatable = false, length = 40)
    private String providerPaymentId;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "status_detail", length = 100)
    private String statusDetail;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "needs_review", nullable = false)
    private boolean needsReview;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Payment(Long orderId, String providerPaymentId, String status, String statusDetail, BigDecimal amount) {
        this.orderId = orderId;
        this.provider = PROVIDER_MERCADOPAGO;
        this.providerPaymentId = providerPaymentId;
        this.status = status;
        this.statusDetail = statusDetail;
        this.amount = amount;
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

    public void update(String status, String statusDetail) {
        this.status = status;
        this.statusDetail = statusDetail;
    }

    public void flagForReview() {
        this.needsReview = true;
    }

    public boolean isApproved() {
        return "approved".equals(status);
    }
}
