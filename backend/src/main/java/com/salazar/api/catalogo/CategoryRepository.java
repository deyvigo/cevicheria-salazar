package com.salazar.api.catalogo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByOrderByIdAsc();

    // Keep the name match in sync with ProductSpecifications.nameMatches
    @Query("""
            select c from Category c
            where exists (
                select 1 from Product p
                where p.category = c
                  and p.active = true
                  and cast(function('unaccent', lower(p.name)) as String) like :pattern escape '!'
            )
            order by c.id
            """)
    List<Category> findAllWithActiveMatch(@Param("pattern") String pattern);
}
