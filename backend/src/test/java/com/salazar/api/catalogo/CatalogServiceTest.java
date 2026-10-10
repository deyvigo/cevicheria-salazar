package com.salazar.api.catalogo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.catalogo.dto.ProductDetailResponse;
import com.salazar.api.common.exception.ProductNotFoundException;
import java.util.Optional;
import com.salazar.api.common.config.StorageProperties;
import com.salazar.api.catalogo.dto.ProductResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {
    private static final Category CEVICHES = new Category("Ceviches", "ceviches");

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

    private CatalogService service() {
        return new CatalogService(
                categoryRepository,
                productRepository,
                new ImageUrlResolver(
                        new StorageProperties("http://s3.test", "garage", "key", "secret", "platos", "http://media.test")),
                new CatalogProperties(18));
    }

    private static Product product(String name, BigDecimal rating) {
        return new Product(name, "desc", new BigDecimal("32.00"), CEVICHES, rating);
    }

    private static Page<Product> page(int pageNumber, long total, List<Product> content) {
        return new PageImpl<>(content, org.springframework.data.domain.PageRequest.of(pageNumber, 18), total);
    }

    @Test
    void pageBelowOneIsTreatedAsFirst() {
        when(productRepository.findByActiveTrueAndCategorySlug(eq("ceviches"), any(Pageable.class)))
                .thenReturn(page(0, 40, List.of(product("A", null))));

        PageResponse<ProductResponse> result = service().listProducts("ceviches", -3, ProductSort.NAME_ASC);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findByActiveTrueAndCategorySlug(eq("ceviches"), captor.capture());
        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(18);
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.totalPages()).isEqualTo(3);
    }

    @Test
    void pageBeyondTotalReturnsLastPage() {
        List<Product> lastPage = IntStream.range(0, 4).mapToObj(i -> product("P" + i, null)).toList();
        when(productRepository.findByActiveTrueAndCategorySlug(eq("ceviches"), any(Pageable.class)))
                .thenReturn(page(98, 40, List.of()))
                .thenReturn(page(2, 40, lastPage));

        PageResponse<ProductResponse> result = service().listProducts("ceviches", 99, ProductSort.NAME_ASC);

        assertThat(result.page()).isEqualTo(3);
        assertThat(result.items()).hasSize(4);
        assertThat(result.totalItems()).isEqualTo(40);
    }

    @Test
    void unknownCategoryReturnsEmptyPage() {
        when(productRepository.findByActiveTrueAndCategorySlug(eq("pizzas"), any(Pageable.class)))
                .thenReturn(page(0, 0, List.of()));

        PageResponse<ProductResponse> result = service().listProducts("pizzas", 1, ProductSort.NAME_ASC);

        assertThat(result.items()).isEmpty();
        assertThat(result.totalItems()).isZero();
        assertThat(result.page()).isEqualTo(1);
    }

    @Test
    void productWithoutImagesHasNullImageUrlAndMainImageIsFirstByPosition() {
        Product withImages = product("Con foto", new BigDecimal("4.5"));
        withImages.addImage("platos/principal.jpg", 0);
        withImages.addImage("platos/secundaria.jpg", 1);
        Product withoutImages = product("Sin foto", null);
        when(productRepository.findByActiveTrueAndCategorySlug(eq("ceviches"), any(Pageable.class)))
                .thenReturn(page(0, 2, List.of(withImages, withoutImages)));

        List<ProductResponse> items = service().listProducts("ceviches", 1, ProductSort.NAME_ASC).items();

        assertThat(items.get(0).imageUrl()).isEqualTo("http://media.test/platos/principal.jpg");
        assertThat(items.get(1).imageUrl()).isNull();
        assertThat(items.get(1).rating()).isNull();
    }

    @Test
    void sortIsPassedToTheRepositoryQuery() {
        when(productRepository.findByActiveTrueAndCategorySlug(eq("ceviches"), any(Pageable.class)))
                .thenReturn(page(0, 1, List.of(product("A", null))));

        service().listProducts("ceviches", 1, ProductSort.PRICE_DESC);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findByActiveTrueAndCategorySlug(eq("ceviches"), captor.capture());
        assertThat(captor.getValue().getSort().getOrderFor("price").isDescending()).isTrue();
    }

    @Test
    void detailReturnsAllImagesInPositionOrderWithFullUrlsAndCategory() {
        Product dish = product("Con fotos", new BigDecimal("4.5"));
        dish.addImage("platos/principal.jpg", 0);
        dish.addImage("platos/secundaria.jpg", 1);
        when(productRepository.findByIdAndActiveTrue(7L)).thenReturn(Optional.of(dish));

        ProductDetailResponse detail = service().getProduct(7L);

        assertThat(detail.images())
                .containsExactly("http://media.test/platos/principal.jpg", "http://media.test/platos/secundaria.jpg");
        assertThat(detail.category().slug()).isEqualTo("ceviches");
        assertThat(detail.rating()).isEqualByComparingTo("4.5");
    }

    @Test
    void detailOfProductWithoutImagesOrRatingHasEmptyImagesAndNullRating() {
        when(productRepository.findByIdAndActiveTrue(8L)).thenReturn(Optional.of(product("Sin foto", null)));

        ProductDetailResponse detail = service().getProduct(8L);

        assertThat(detail.images()).isEmpty();
        assertThat(detail.rating()).isNull();
    }

    @Test
    void detailOfMissingOrInactiveProductThrowsNotFound() {
        when(productRepository.findByIdAndActiveTrue(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getProduct(99L)).isInstanceOf(ProductNotFoundException.class);
    }
}
