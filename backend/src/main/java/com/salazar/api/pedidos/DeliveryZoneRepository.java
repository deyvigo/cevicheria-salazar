package com.salazar.api.pedidos;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DeliveryZoneRepository extends JpaRepository<DeliveryZone, Long> {
    @Query("select z from DeliveryZone z order by lower(z.name), z.id")
    List<DeliveryZone> findAllOrdered();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
