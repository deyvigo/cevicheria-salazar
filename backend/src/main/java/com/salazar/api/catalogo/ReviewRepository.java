package com.salazar.api.catalogo;

import com.salazar.api.catalogo.dto.ReviewResponse;
import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    Optional<Review> findByProductIdAndUserId(Long productId, Long userId);

    @Query(
            value = """
                    select new com.salazar.api.catalogo.dto.ReviewResponse(
                        r.id, coalesce(u.firstName, 'Cliente'), r.rating, r.comment, r.createdAt,
                        case when r.updatedAt > r.createdAt then true else false end)
                    from Review r left join User u on u.id = r.userId
                    where r.productId = :productId and r.rating between :min and :max
                    order by r.createdAt desc, r.id desc""",
            countQuery = "select count(r) from Review r where r.productId = :productId and r.rating between :min and :max")
    Page<ReviewResponse> findPage(
            @Param("productId") Long productId, @Param("min") int min, @Param("max") int max, Pageable pageable);

    long countByProductId(Long productId);

    @Query("select avg(r.rating) from Review r where r.productId = :productId")
    Double averageRating(@Param("productId") Long productId);
}
