package com.salazar.api.catalogo;

import com.salazar.api.catalogo.dto.CategoryResponse;
import com.salazar.api.catalogo.dto.FeaturedProductResponse;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.catalogo.dto.ProductDetailResponse;
import com.salazar.api.catalogo.dto.ProductResponse;
import com.salazar.api.common.exception.ProductNotFoundException;
import com.salazar.api.common.exception.TooManyIdsException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(CatalogProperties.class)
public class CatalogService {
    static final int MAX_IDS_PER_LOOKUP = 100;
    static final int FEATURED_SLOTS = 5;
    static final int FEATURED_MIN = 3;
    static final Duration BEST_SELLER_WINDOW = Duration.ofDays(30);

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;
    private final ImageUrlResolver imageUrlResolver;
    private final CatalogProperties properties;

    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories(String query) {
        String pattern = NamePattern.from(query);
        List<Category> categories = pattern == null
                ? categoryRepository.findAllByOrderByIdAsc()
                : categoryRepository.findAllWithActiveMatch(pattern);
        return categories.stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> listProducts(
            String categorySlug, String query, int page, ProductSort sort) {
        int requested = Math.max(page, 1);
        Specification<Product> filter = filter(categorySlug, query);
        Page<Product> result = fetch(filter, requested, sort);
        if (result.getTotalPages() > 0 && requested > result.getTotalPages()) {
            result = fetch(filter, result.getTotalPages(), sort);
        }
        List<ProductResponse> items = result.getContent().stream().map(this::toResponse).toList();
        return new PageResponse<>(
                items, result.getNumber() + 1, properties.pageSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ProductDetailResponse getProduct(Long id) {
        Product product = productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(id).orElseThrow(ProductNotFoundException::new);
        List<String> images = product.getImages().stream()
                .map(image -> imageUrlResolver.resolve(image.getPath()))
                .toList();
        return new ProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getRating(),
                reviewRepository.countByProductId(product.getId()),
                product.isOrderable(),
                product.getStock(),
                CategoryResponse.from(product.getCategory()),
                images);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getProductsByIds(List<Long> ids) {
        List<Long> distinct = ids.stream().distinct().toList();
        if (distinct.size() > MAX_IDS_PER_LOOKUP) {
            throw new TooManyIdsException(MAX_IDS_PER_LOOKUP);
        }
        if (distinct.isEmpty()) {
            return List.of();
        }
        return productRepository.findAllByIdInAndActiveTrueAndDeletedAtIsNullOrderByIdAsc(distinct).stream()
                .map(this::toResponse)
                .toList();
    }

    // Best sellers first; empty slots go to the best rated, then the newest, so the grid is always complete
    @Transactional(readOnly = true)
    public List<FeaturedProductResponse> featured() {
        if (productRepository.countOrderable() < FEATURED_MIN) return List.of();

        List<Long> bestSellerIds =
                productRepository.findBestSellerIds(Instant.now().minus(BEST_SELLER_WINDOW), FEATURED_SLOTS);
        Map<Long, Product> bestSellers = productRepository.findAllById(bestSellerIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        List<FeaturedProductResponse> result = new ArrayList<>();
        Set<Long> taken = new HashSet<>();
        for (Long id : bestSellerIds) {
            result.add(FeaturedProductResponse.of(toResponse(bestSellers.get(id)), true));
            taken.add(id);
        }
        // Twice the slots is enough: at most FEATURED_SLOTS of them can already be taken
        for (Product product : productRepository.findOrderableByRating(PageRequest.of(0, FEATURED_SLOTS * 2))) {
            if (result.size() == FEATURED_SLOTS) break;
            if (taken.add(product.getId())) result.add(FeaturedProductResponse.of(toResponse(product), false));
        }
        return result;
    }

    private Specification<Product> filter(String categorySlug, String query) {
        Specification<Product> filter = ProductSpecifications.active();
        if (categorySlug != null && !categorySlug.isBlank()) {
            filter = filter.and(ProductSpecifications.inCategory(categorySlug));
        }
        String pattern = NamePattern.from(query);
        if (pattern != null) {
            filter = filter.and(ProductSpecifications.nameMatches(pattern));
        }
        return filter;
    }

    private Page<Product> fetch(Specification<Product> filter, int page, ProductSort sort) {
        return productRepository.findAll(filter, PageRequest.of(page - 1, properties.pageSize(), sort.toSort()));
    }

    private ProductResponse toResponse(Product product) {
        String imageUrl = product.getImages().stream()
                .findFirst()
                .map(image -> imageUrlResolver.resolve(image.getPath()))
                .orElse(null);
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getRating(),
                imageUrl,
                product.isOrderable(),
                product.getStock());
    }
}
