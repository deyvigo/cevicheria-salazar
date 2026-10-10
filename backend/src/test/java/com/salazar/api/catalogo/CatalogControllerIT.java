package com.salazar.api.catalogo;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import java.math.BigDecimal;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class CatalogControllerIT {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @BeforeEach
    void seedProducts() {
        productRepository.deleteAll();
        Category ceviches = categoryRepository.findAll().stream()
                .filter(c -> c.getSlug().equals("ceviches"))
                .findFirst()
                .orElseThrow();
        Category bebidas = categoryRepository.findAll().stream()
                .filter(c -> c.getSlug().equals("bebidas"))
                .findFirst()
                .orElseThrow();

        IntStream.rangeClosed(1, 40).forEach(i -> {
            Product product = new Product(
                    "Ceviche %02d".formatted(i), "desc", new BigDecimal("32.00"), ceviches, new BigDecimal("4.5"));
            if (i != 1) {
                product.addImage("platos/ceviche-%02d.jpg".formatted(i), 0);
            }
            productRepository.save(product);
        });
        Product inactive = new Product("Ceviche retirado", "desc", new BigDecimal("20.00"), ceviches, null);
        inactive.deactivate();
        productRepository.save(inactive);
        productRepository.save(new Product("Chicha", "desc", new BigDecimal("8.00"), bebidas, null));
    }

    @Test
    void categoriesAreListedInIdOrderWithSlugWithoutSession() throws Exception {
        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[0].slug").value("entradas"))
                .andExpect(jsonPath("$[1].name").value("Ceviches"))
                .andExpect(jsonPath("$[4].slug").value("bebidas"));
    }

    @Test
    void firstPageHasTwentyOrderedProductsAndTotals() throws Exception {
        mockMvc.perform(get("/api/products").param("category", "ceviches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(20)))
                .andExpect(jsonPath("$.items[0].name").value("Ceviche 01"))
                .andExpect(jsonPath("$.items[0].imageUrl").value(nullValue()))
                .andExpect(jsonPath("$.items[1].imageUrl").value("http://localhost:9000/platos/platos/ceviche-02.jpg"))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(20))
                .andExpect(jsonPath("$.totalItems").value(40))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void secondPageHasTheRest() throws Exception {
        mockMvc.perform(get("/api/products").param("category", "ceviches").param("page", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(20)))
                .andExpect(jsonPath("$.items[0].name").value("Ceviche 21"))
                .andExpect(jsonPath("$.page").value(2));
    }

    @Test
    void inactiveProductsAreExcludedFromItemsAndTotal() throws Exception {
        mockMvc.perform(get("/api/products").param("category", "ceviches").param("page", "2"))
                .andExpect(jsonPath("$.totalItems").value(40))
                .andExpect(jsonPath("$.items[?(@.name == 'Ceviche retirado')]").isEmpty());
    }

    @Test
    void pageBeyondTotalReturnsLastPage() throws Exception {
        mockMvc.perform(get("/api/products").param("category", "ceviches").param("page", "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.items[0].name").value("Ceviche 21"));
    }

    @Test
    void unknownCategoryReturnsEmptyPage() throws Exception {
        mockMvc.perform(get("/api/products").param("category", "pizzas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void missingCategoryReturns400() throws Exception {
        mockMvc.perform(get("/api/products")).andExpect(status().isBadRequest());
    }

    @Test
    void nonNumericPageReturns400() throws Exception {
        mockMvc.perform(get("/api/products").param("category", "ceviches").param("page", "abc"))
                .andExpect(status().isBadRequest());
    }

    private Category category(String slug) {
        return categoryRepository.findAll().stream()
                .filter(c -> c.getSlug().equals(slug))
                .findFirst()
                .orElseThrow();
    }

    private void seedSortable() {
        productRepository.deleteAll();
        Category fondos = category("fondos");
        productRepository.save(new Product("Beta", "d", new BigDecimal("20.00"), fondos, new BigDecimal("4.0")));
        productRepository.save(new Product("Alfa", "d", new BigDecimal("30.00"), fondos, null));
        productRepository.save(new Product("Gamma", "d", new BigDecimal("10.00"), fondos, new BigDecimal("4.8")));
    }

    @Test
    void sortsByPriceAscendingAndDescending() throws Exception {
        seedSortable();

        mockMvc.perform(get("/api/products").param("category", "fondos").param("sort", "price_asc"))
                .andExpect(jsonPath("$.items[0].name").value("Gamma"))
                .andExpect(jsonPath("$.items[2].name").value("Alfa"));
        mockMvc.perform(get("/api/products").param("category", "fondos").param("sort", "price_desc"))
                .andExpect(jsonPath("$.items[0].name").value("Alfa"))
                .andExpect(jsonPath("$.items[2].name").value("Gamma"));
    }

    @Test
    void sortsByRatingDescendingWithUnratedLast() throws Exception {
        seedSortable();

        mockMvc.perform(get("/api/products").param("category", "fondos").param("sort", "rating_desc"))
                .andExpect(jsonPath("$.items[0].name").value("Gamma"))
                .andExpect(jsonPath("$.items[1].name").value("Beta"))
                .andExpect(jsonPath("$.items[2].name").value("Alfa"));
    }

    @Test
    void sortsByRatingAscendingWithUnratedLast() throws Exception {
        seedSortable();

        mockMvc.perform(get("/api/products").param("category", "fondos").param("sort", "rating_asc"))
                .andExpect(jsonPath("$.items[0].name").value("Beta"))
                .andExpect(jsonPath("$.items[1].name").value("Gamma"))
                .andExpect(jsonPath("$.items[2].name").value("Alfa"));
    }

    @Test
    void sortsByNameDescendingAndUnknownSortFallsBackToNameAscending() throws Exception {
        seedSortable();

        mockMvc.perform(get("/api/products").param("category", "fondos").param("sort", "name_desc"))
                .andExpect(jsonPath("$.items[0].name").value("Gamma"));
        mockMvc.perform(get("/api/products").param("category", "fondos").param("sort", "xyz"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Alfa"));
    }

    @Test
    void sortAppliesToTheWholeCategoryAcrossPages() throws Exception {
        mockMvc.perform(get("/api/products")
                        .param("category", "ceviches")
                        .param("sort", "name_desc")
                        .param("page", "2"))
                .andExpect(jsonPath("$.items[0].name").value("Ceviche 20"))
                .andExpect(jsonPath("$.items[19].name").value("Ceviche 01"));
    }
}
