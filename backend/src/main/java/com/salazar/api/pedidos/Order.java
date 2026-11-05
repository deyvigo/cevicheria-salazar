package com.salazar.api.pedidos;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false, length = 12)
    private String code;

    @Column(name = "delivery_code", nullable = false, updatable = false, length = 4)
    private String deliveryCode;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, updatable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_type", nullable = false, updatable = false, length = 10)
    private DeliveryType deliveryType;

    @Column(name = "address_id", updatable = false)
    private Long addressId;

    @Column(name = "address_label", updatable = false, length = 40)
    private String addressLabel;

    @Column(name = "address_text", updatable = false, length = 200)
    private String addressText;

    @Column(name = "address_reference", updatable = false, length = 200)
    private String addressReference;

    @Column(name = "address_latitude", updatable = false, precision = 9, scale = 6)
    private BigDecimal addressLatitude;

    @Column(name = "address_longitude", updatable = false, precision = 9, scale = 6)
    private BigDecimal addressLongitude;

    @Column(name = "delivery_zone_name", updatable = false, length = 60)
    private String deliveryZoneName;

    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal discount;

    @Column(name = "delivery_price", nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal deliveryPrice;

    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancel_reason", length = 30)
    private String cancelReason;

    @Column(name = "preference_id", length = 100)
    private String preferenceId;

    @Column(name = "init_point", length = 500)
    private String initPoint;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    public Order(
            Long userId,
            String code,
            String deliveryCode,
            PaymentMethod paymentMethod,
            DeliveryType deliveryType,
            BigDecimal subtotal,
            BigDecimal deliveryPrice,
            Instant expiresAt) {
        this.userId = userId;
        this.code = code;
        this.deliveryCode = deliveryCode;
        this.paymentMethod = paymentMethod;
        this.deliveryType = deliveryType;
        this.subtotal = subtotal;
        this.discount = BigDecimal.ZERO.setScale(2);
        this.deliveryPrice = deliveryPrice;
        this.total = subtotal.add(deliveryPrice);
        this.expiresAt = expiresAt;
        this.status = OrderStatus.PENDIENTE_PAGO;
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

    public void addItem(Long productId, String productName, BigDecimal unitPrice, int quantity) {
        items.add(new OrderItem(this, productId, productName, unitPrice, quantity));
    }

    public void setDeliveryAddress(
            Long addressId,
            String label,
            String text,
            String reference,
            BigDecimal latitude,
            BigDecimal longitude,
            String zoneName) {
        this.addressId = addressId;
        this.addressLabel = label;
        this.addressText = text;
        this.addressReference = reference;
        this.addressLatitude = latitude;
        this.addressLongitude = longitude;
        this.deliveryZoneName = zoneName;
    }

    public boolean isPending() {
        return status == OrderStatus.PENDIENTE_PAGO;
    }

    public void attachCheckout(String preferenceId, String initPoint) {
        this.preferenceId = preferenceId;
        this.initPoint = initPoint;
    }

    public void markPaid() {
        this.status = OrderStatus.PAGADO;
        this.paidAt = Instant.now();
    }

    public void cancel(String reason) {
        this.status = OrderStatus.CANCELADO;
        this.cancelledAt = Instant.now();
        this.cancelReason = reason;
    }
}
