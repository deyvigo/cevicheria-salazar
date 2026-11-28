package com.salazar.api.catalogo;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    Optional<Product> findByIdAndActiveTrueAndDeletedAtIsNull(Long id);

    Optional<Product> findByIdAndDeletedAtIsNull(Long id);

    // Soft-deleted dishes still reference their category, so they keep counting here and block deleting it
    boolean existsByCategoryId(Long categoryId);

    long countByCategoryId(Long categoryId);

    List<Product> findAllByIdInAndActiveTrueAndDeletedAtIsNullOrderByIdAsc(Collection<Long> ids);

    // Only paid orders, by payment date, like the sales report: cash on delivery counts once collected
    @Query(
            value = "SELECT p.id FROM order_items i"
                    + " JOIN orders o ON o.id = i.order_id"
                    + " JOIN products p ON p.id = i.product_id"
                    + " WHERE o.status = 'PAGADO' AND o.paid_at >= :since"
                    + " AND p.is_active AND p.deleted_at IS NULL AND p.is_available AND p.stock > 0"
                    + " GROUP BY p.id, p.name"
                    + " ORDER BY SUM(i.quantity) DESC, SUM(i.line_total) DESC, p.name, p.id"
                    + " LIMIT :limit",
            nativeQuery = true)
    List<Long> findBestSellerIds(@Param("since") Instant since, @Param("limit") int limit);

    @Query("select p from Product p where p.active = true and p.deletedAt is null and p.available = true and p.stock > 0"
            + " order by p.rating desc nulls last, p.createdAt desc, p.id desc")
    List<Product> findOrderableByRating(Pageable pageable);

    @Query("select count(p) from Product p where p.active = true and p.deletedAt is null and p.available = true and p.stock > 0")
    long countOrderable();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    // Always ordered by id so concurrent orders lock rows in the same order and cannot deadlock
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id in :ids order by p.id")
    List<Product> findAllByIdInForUpdate(@Param("ids") Collection<Long> ids);
}
