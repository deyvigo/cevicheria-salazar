package com.salazar.api.catalogo;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    Optional<Product> findByIdAndActiveTrueAndDeletedAtIsNull(Long id);

    Optional<Product> findByIdAndDeletedAtIsNull(Long id);

    // Soft-deleted dishes still reference their category, so they keep counting here and block deleting it
    boolean existsByCategoryId(Long categoryId);

    long countByCategoryId(Long categoryId);

    List<Product> findAllByIdInAndActiveTrueAndDeletedAtIsNullOrderByIdAsc(Collection<Long> ids);
}
