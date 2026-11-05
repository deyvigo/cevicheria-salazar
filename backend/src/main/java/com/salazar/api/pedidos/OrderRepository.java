package com.salazar.api.pedidos;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {
    @Query("select o from Order o left join fetch o.items where o.id = :id and o.userId = :userId")
    Optional<Order> findByIdAndUserIdWithItems(@Param("id") Long id, @Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    @Query("select o from Order o where o.userId = :userId and o.status = :status")
    List<Order> findAllByUserIdAndStatus(@Param("userId") Long userId, @Param("status") OrderStatus status);

    @Query("select o.id from Order o where o.status = :status and o.expiresAt < :before order by o.id")
    List<Long> findIdsByStatusAndExpiresAtBefore(
            @Param("status") OrderStatus status, @Param("before") Instant before, Pageable pageable);

    @Query(value = "SELECT nextval('order_code_seq')", nativeQuery = true)
    long nextCodeNumber();
}
