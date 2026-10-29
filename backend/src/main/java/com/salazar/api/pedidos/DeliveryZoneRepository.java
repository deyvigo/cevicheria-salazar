package com.salazar.api.pedidos;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DeliveryZoneRepository extends JpaRepository<DeliveryZone, Long> {
    @Query("select z from DeliveryZone z order by lower(z.name), z.id")
    List<DeliveryZone> findAllOrdered();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    @Query(
            value = """
                    SELECT * FROM delivery_zones
                    WHERE active AND ST_Covers(area, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326))
                    ORDER BY price ASC, id ASC
                    LIMIT 1
                    """,
            nativeQuery = true)
    Optional<DeliveryZone> findCheapestCovering(
            @Param("longitude") double longitude, @Param("latitude") double latitude);
}
