package com.salazar.api.catalogo;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    Optional<Product> findByIdAndActiveTrue(Long id);

    List<Product> findAllByIdInAndActiveTrueOrderByIdAsc(Collection<Long> ids);
}
