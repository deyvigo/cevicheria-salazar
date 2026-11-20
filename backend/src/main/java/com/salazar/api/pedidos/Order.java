package com.salazar.api.pedidos;

import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.common.exception.OrderDeliveryConflictException;
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
    public static final int MAX_REASON_LENGTH = 200;

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
    @Column(name = "delivery_status", nullable = false, length = 20)
    private DeliveryStatus deliveryStatus = DeliveryStatus.PENDIENTE;

    @Column(name = "delivery_reason", length = 200)
    private String deliveryReason;

    @Column(name = "delivery_updated_at")
    private Instant deliveryUpdatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", length = 12)
    private RefundStatus refundStatus;

    @Column(name = "refunded_at")
    private Instant refundedAt;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "collection_method", updatable = false, length = 10)
    private CollectionMethod collectionMethod;

    @Column(name = "cash_amount", updatable = false, precision = 10, scale = 2)
    private BigDecimal cashAmount;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "confirmation_sent_at")
    private Instant confirmationSentAt;

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
        this.status = paymentMethod == PaymentMethod.CONTRAENTREGA
                ? OrderStatus.PENDIENTE_COBRO
                : OrderStatus.PENDIENTE_PAGO;
    }

    public void setCollection(CollectionMethod method, BigDecimal cashAmount) {
        this.collectionMethod = method;
        this.cashAmount = method == CollectionMethod.EFECTIVO ? cashAmount : null;
    }

    public BigDecimal getChange() {
        return cashAmount == null ? null : cashAmount.subtract(total);
    }

    /** Confirmed orders whose delivery code the customer may already see. */
    public boolean isConfirmed() {
        return status == OrderStatus.PAGADO || status == OrderStatus.PENDIENTE_COBRO;
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

    /** Moves the delivery to a status allowed for this kind of order, only if the caller saw the stage it is really in. */
    public void moveDelivery(DeliveryStatus expected, DeliveryStatus to, String reason, String enteredCode) {
        if (!isConfirmed()) {
            throw new OrderDeliveryConflictException("Este pedido aún no está comprado.");
        }
        if (deliveryStatus != expected) {
            throw new OrderDeliveryConflictException("El pedido ya había cambiado de estado.");
        }
        if (!deliveryStatus.canMoveTo(to, deliveryType)) {
            throw new OrderDeliveryConflictException("El pedido no puede pasar de ese estado al elegido.");
        }
        if (to == DeliveryStatus.ENTREGADO && (enteredCode == null || !deliveryCode.equals(enteredCode.strip()))) {
            throw new FieldInvalidException("deliveryCode", "El código de entrega no coincide.");
        }
        String cleanReason = reason == null || reason.isBlank() ? null : reason.strip();
        if (to.needsReason() && cleanReason == null) {
            throw new FieldInvalidException("reason", "Indica el motivo.");
        }
        if (cleanReason != null && cleanReason.length() > MAX_REASON_LENGTH) {
            throw new FieldInvalidException("reason", "El motivo no puede superar los 200 caracteres.");
        }
        this.deliveryStatus = to;
        this.deliveryReason = to.needsReason() ? cleanReason : null;
        this.deliveryUpdatedAt = Instant.now();
        if (to.releasesStock() && status == OrderStatus.PAGADO) {
            this.refundStatus = RefundStatus.PENDIENTE;
        }
    }

    public void markRefunded() {
        if (refundStatus != RefundStatus.PENDIENTE) {
            throw new OrderDeliveryConflictException("Este pedido no tiene un reembolso pendiente.");
        }
        this.refundStatus = RefundStatus.REEMBOLSADO;
        this.refundedAt = Instant.now();
    }

    public void cancel(String reason) {
        this.status = OrderStatus.CANCELADO;
        this.cancelledAt = Instant.now();
        this.cancelReason = reason;
    }
}
