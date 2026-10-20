package com.salazar.api.catalogo;

import com.salazar.api.admin.dto.AdminCategoryResponse;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByOrderByIdAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    @Query(
            value = """
                    select new com.salazar.api.admin.dto.AdminCategoryResponse(
                        c.id, c.name, c.slug, (select count(p) from Product p where p.category = c))
                    from Category c
                    order by lower(c.name), c.id
                    """,
            countQuery = "select count(c) from Category c")
    Page<AdminCategoryResponse> findAllWithProductCount(Pageable pageable);

    @Query(
            value = """
                    select new com.salazar.api.admin.dto.AdminCategoryResponse(
                        c.id, c.name, c.slug, (select count(p) from Product p where p.category = c))
                    from Category c
                    where lower(c.name) like :pattern escape '!' or lower(c.slug) like :pattern escape '!'
                    order by lower(c.name), c.id
                    """,
            countQuery =
                    """
                    select count(c) from Category c
                    where lower(c.name) like :pattern escape '!' or lower(c.slug) like :pattern escape '!'
                    """)
    Page<AdminCategoryResponse> searchWithProductCount(@Param("pattern") String pattern, Pageable pageable);

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
