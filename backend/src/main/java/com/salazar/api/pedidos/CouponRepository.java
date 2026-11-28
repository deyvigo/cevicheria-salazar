package com.salazar.api.pedidos;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CouponRepository extends JpaRepository<Coupon, Long> {
    Optional<Coupon> findByCode(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Coupon c where c.code = :code")
    Optional<Coupon> findByCodeForUpdate(@Param("code") String code);

    // Same statuses as idx_orders_coupon_usage: a cancelled unpaid order no longer holds a use
    @Query(value = """
            SELECT count(*) FROM orders
            WHERE coupon_id = :couponId AND status IN ('PENDIENTE_PAGO', 'PENDIENTE_COBRO', 'PAGADO')
            """, nativeQuery = true)
    long countUses(@Param("couponId") Long couponId);

    @Query(value = """
            SELECT count(*) FROM orders
            WHERE coupon_id = :couponId AND user_id = :userId
              AND status IN ('PENDIENTE_PAGO', 'PENDIENTE_COBRO', 'PAGADO')
            """, nativeQuery = true)
    long countUsesByCustomer(@Param("couponId") Long couponId, @Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Coupon c where c.id = :id")
    Optional<Coupon> findByIdForUpdate(@Param("id") Long id);

    List<Coupon> findAllByOrderByCreatedAtDescIdDesc();

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    // Any order keeps a foreign key to the coupon, whatever its status, so it blocks deleting and renaming
    @Query(value = "SELECT EXISTS (SELECT 1 FROM orders WHERE coupon_id = :couponId)", nativeQuery = true)
    boolean hasOrders(@Param("couponId") Long couponId);

    interface Usage {
        Long getCouponId();

        Long getUses();

        Long getOrders();
    }

    @Query(value = """
            SELECT coupon_id AS couponId,
                   count(*) FILTER (WHERE status IN ('PENDIENTE_PAGO', 'PENDIENTE_COBRO', 'PAGADO')) AS uses,
                   count(*) AS orders
            FROM orders
            WHERE coupon_id IS NOT NULL
            GROUP BY coupon_id
            """, nativeQuery = true)
    List<Usage> usage();
}
