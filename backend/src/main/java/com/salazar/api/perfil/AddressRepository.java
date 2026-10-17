package com.salazar.api.perfil;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(Long userId);

    Optional<Address> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);

    long countByUserIdAndDeletedAtIsNull(Long userId);
}
