package com.salazar.api.catalogo;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
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

    // Always ordered by id so concurrent orders lock rows in the same order and cannot deadlock
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id in :ids order by p.id")
    List<Product> findAllByIdInForUpdate(@Param("ids") Collection<Long> ids);
}
