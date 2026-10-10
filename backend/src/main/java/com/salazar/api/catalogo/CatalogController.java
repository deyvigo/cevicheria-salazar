package com.salazar.api.catalogo;

import com.salazar.api.catalogo.dto.CategoryResponse;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.catalogo.dto.ProductDetailResponse;
import com.salazar.api.catalogo.dto.ProductResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CatalogController {
    private final CatalogService catalogService;

    @GetMapping("/categories")
    public List<CategoryResponse> categories(@RequestParam(required = false) String q) {
        return catalogService.listCategories(q);
    }

    @GetMapping("/products")
    public PageResponse<ProductResponse> products(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(required = false) String sort) {
        return catalogService.listProducts(category, q, page, ProductSort.from(sort));
    }

    @GetMapping("/products/{id}")
    public ProductDetailResponse product(@PathVariable Long id) {
        return catalogService.getProduct(id);
    }
}
