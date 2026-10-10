package com.salazar.api.catalogo;

import com.salazar.api.catalogo.dto.CategoryResponse;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.catalogo.dto.ProductDetailResponse;
import com.salazar.api.catalogo.dto.ProductResponse;
import com.salazar.api.common.exception.ProductNotFoundException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(CatalogProperties.class)
public class CatalogService {
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ImageUrlResolver imageUrlResolver;
    private final CatalogProperties properties;

    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        return categoryRepository.findAllByOrderByIdAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> listProducts(String categorySlug, int page, ProductSort sort) {
        int requested = Math.max(page, 1);
        Page<Product> result = fetch(categorySlug, requested, sort);
        if (result.getTotalPages() > 0 && requested > result.getTotalPages()) {
            result = fetch(categorySlug, result.getTotalPages(), sort);
        }
        List<ProductResponse> items = result.getContent().stream().map(this::toResponse).toList();
        return new PageResponse<>(
                items, result.getNumber() + 1, properties.pageSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ProductDetailResponse getProduct(Long id) {
        Product product = productRepository.findByIdAndActiveTrue(id).orElseThrow(ProductNotFoundException::new);
        List<String> images = product.getImages().stream()
                .map(image -> imageUrlResolver.resolve(image.getPath()))
                .toList();
        return new ProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getRating(),
                product.isAvailable(),
                CategoryResponse.from(product.getCategory()),
                images);
    }

    private Page<Product> fetch(String categorySlug, int page, ProductSort sort) {
        return productRepository.findByActiveTrueAndCategorySlug(
                categorySlug, PageRequest.of(page - 1, properties.pageSize(), sort.toSort()));
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
                imageUrl);
    }
}
