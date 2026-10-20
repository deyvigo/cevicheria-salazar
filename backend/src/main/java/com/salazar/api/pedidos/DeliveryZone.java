package com.salazar.api.pedidos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Polygon;

@Entity
@Table(name = "delivery_zones")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeliveryZone {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, length = 20)
    private String color;

    @JdbcTypeCode(SqlTypes.GEOMETRY)
    @Column(nullable = false, columnDefinition = "geometry(Polygon,4326)")
    private Polygon area;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public DeliveryZone(String name, BigDecimal price, String color, Polygon area, boolean active) {
        this.name = name;
        this.price = price;
        this.color = color;
        this.area = area;
        this.active = active;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String name, BigDecimal price, String color, Polygon area, boolean active) {
        this.name = name;
        this.price = price;
        this.color = color;
        this.area = area;
        this.active = active;
        this.updatedAt = Instant.now();
    }
}
