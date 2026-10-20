package com.salazar.api.catalogo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.catalogo.dto.CategoryResponse;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.catalogo.dto.ProductDetailResponse;
import com.salazar.api.common.exception.ProductNotFoundException;
import com.salazar.api.common.exception.TooManyIdsException;
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
import org.springframework.data.jpa.domain.Specification;

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

    @SuppressWarnings("unchecked")
    private static Specification<Product> anySpec() {
        return any(Specification.class);
    }

    private static Product product(String name, BigDecimal rating) {
        return new Product(name, "desc", new BigDecimal("32.00"), CEVICHES, rating, 10);
    }

    private static Page<Product> page(int pageNumber, long total, List<Product> content) {
        return new PageImpl<>(content, org.springframework.data.domain.PageRequest.of(pageNumber, 18), total);
    }

    @Test
    void pageBelowOneIsTreatedAsFirst() {
        when(productRepository.findAll(anySpec(), any(Pageable.class)))
                .thenReturn(page(0, 40, List.of(product("A", null))));

        PageResponse<ProductResponse> result = service().listProducts("ceviches", null, -3, ProductSort.NAME_ASC);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findAll(anySpec(), captor.capture());
        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(18);
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.totalPages()).isEqualTo(3);
    }

    @Test
    void pageBeyondTotalReturnsLastPage() {
        List<Product> lastPage = IntStream.range(0, 4).mapToObj(i -> product("P" + i, null)).toList();
        when(productRepository.findAll(anySpec(), any(Pageable.class)))
                .thenReturn(page(98, 40, List.of()))
                .thenReturn(page(2, 40, lastPage));

        PageResponse<ProductResponse> result = service().listProducts("ceviches", null, 99, ProductSort.NAME_ASC);

        assertThat(result.page()).isEqualTo(3);
        assertThat(result.items()).hasSize(4);
        assertThat(result.totalItems()).isEqualTo(40);
    }

    @Test
    void unknownCategoryReturnsEmptyPage() {
        when(productRepository.findAll(anySpec(), any(Pageable.class)))
                .thenReturn(page(0, 0, List.of()));

        PageResponse<ProductResponse> result = service().listProducts("pizzas", null, 1, ProductSort.NAME_ASC);

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
        when(productRepository.findAll(anySpec(), any(Pageable.class)))
                .thenReturn(page(0, 2, List.of(withImages, withoutImages)));

        List<ProductResponse> items = service().listProducts("ceviches", null, 1, ProductSort.NAME_ASC).items();

        assertThat(items.get(0).imageUrl()).isEqualTo("http://media.test/platos/principal.jpg");
        assertThat(items.get(1).imageUrl()).isNull();
        assertThat(items.get(1).rating()).isNull();
    }

    @Test
    void sortIsPassedToTheRepositoryQuery() {
        when(productRepository.findAll(anySpec(), any(Pageable.class)))
                .thenReturn(page(0, 1, List.of(product("A", null))));

        service().listProducts("ceviches", null, 1, ProductSort.PRICE_DESC);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findAll(anySpec(), captor.capture());
        assertThat(captor.getValue().getSort().getOrderFor("price").isDescending()).isTrue();
    }

    @Test
    void detailReturnsAllImagesInPositionOrderWithFullUrlsAndCategory() {
        Product dish = product("Con fotos", new BigDecimal("4.5"));
        dish.addImage("platos/principal.jpg", 0);
        dish.addImage("platos/secundaria.jpg", 1);
        when(productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(7L)).thenReturn(Optional.of(dish));

        ProductDetailResponse detail = service().getProduct(7L);

        assertThat(detail.images())
                .containsExactly("http://media.test/platos/principal.jpg", "http://media.test/platos/secundaria.jpg");
        assertThat(detail.category().slug()).isEqualTo("ceviches");
        assertThat(detail.rating()).isEqualByComparingTo("4.5");
    }

    @Test
    void detailOfProductWithoutImagesOrRatingHasEmptyImagesAndNullRating() {
        when(productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(8L)).thenReturn(Optional.of(product("Sin foto", null)));

        ProductDetailResponse detail = service().getProduct(8L);

        assertThat(detail.images()).isEmpty();
        assertThat(detail.rating()).isNull();
    }

    @Test
    void detailOfMissingOrInactiveProductThrowsNotFound() {
        when(productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getProduct(99L)).isInstanceOf(ProductNotFoundException.class);
    }

    @Test
    void detailReportsAvailabilityAndKeepsTheRestOfTheDataForSoldOutDishes() {
        Product available = product("Disponible", new BigDecimal("4.5"));
        Product soldOut = product("Agotado", new BigDecimal("4.0"));
        soldOut.markUnavailable();
        soldOut.addImage("platos/agotado.jpg", 0);
        when(productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(1L)).thenReturn(Optional.of(available));
        when(productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(2L)).thenReturn(Optional.of(soldOut));

        ProductDetailResponse availableDetail = service().getProduct(1L);
        ProductDetailResponse soldOutDetail = service().getProduct(2L);

        assertThat(availableDetail.available()).isTrue();
        assertThat(soldOutDetail.available()).isFalse();
        assertThat(soldOutDetail.name()).isEqualTo("Agotado");
        assertThat(soldOutDetail.price()).isEqualByComparingTo("32.00");
        assertThat(soldOutDetail.images()).containsExactly("http://media.test/platos/agotado.jpg");
    }

    @Test
    void availabilityCombinesTheAdminSwitchWithStock() {
        Product free = new Product("Libre", "d", new BigDecimal("10.00"), CEVICHES, null, 3);
        Product empty = new Product("Vacio", "d", new BigDecimal("10.00"), CEVICHES, null, 0);
        Product switchedOff = new Product("Apagado", "d", new BigDecimal("10.00"), CEVICHES, null, 5);
        switchedOff.markUnavailable();
        when(productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(1L)).thenReturn(Optional.of(free));
        when(productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(2L)).thenReturn(Optional.of(empty));
        when(productRepository.findByIdAndActiveTrueAndDeletedAtIsNull(3L)).thenReturn(Optional.of(switchedOff));

        ProductDetailResponse freeDetail = service().getProduct(1L);

        assertThat(freeDetail.available()).isTrue();
        assertThat(freeDetail.stock()).isEqualTo(3);
        assertThat(service().getProduct(2L).available()).isFalse();
        assertThat(service().getProduct(3L).available()).isFalse();
        assertThat(service().getProduct(3L).stock()).isEqualTo(5);
    }

    @Test
    void listingCarriesAvailabilityAndStockForTheAddButton() {
        Product empty = new Product("Vacio", "d", new BigDecimal("10.00"), CEVICHES, null, 0);
        when(productRepository.findAll(anySpec(), any(Pageable.class)))
                .thenReturn(page(0, 2, List.of(product("Libre", null), empty)));

        List<ProductResponse> items = service().listProducts("ceviches", null, 1, ProductSort.NAME_ASC).items();

        assertThat(items.get(0).available()).isTrue();
        assertThat(items.get(0).stock()).isEqualTo(10);
        assertThat(items.get(1).available()).isFalse();
        assertThat(items.get(1).stock()).isZero();
    }

    @Test
    void lookupByIdsDeduplicatesAndOnlyAsksForDistinctIds() {
        when(productRepository.findAllByIdInAndActiveTrueAndDeletedAtIsNullOrderByIdAsc(any()))
                .thenReturn(List.of(product("A", null)));

        List<ProductResponse> result = service().getProductsByIds(List.of(5L, 5L, 7L));

        ArgumentCaptor<java.util.Collection<Long>> captor = ArgumentCaptor.forClass(java.util.Collection.class);
        verify(productRepository).findAllByIdInAndActiveTrueAndDeletedAtIsNullOrderByIdAsc(captor.capture());
        assertThat(captor.getValue()).containsExactly(5L, 7L);
        assertThat(result).hasSize(1);
    }

    @Test
    void lookupByMoreThanTheLimitIsRejectedAndNeverHitsTheRepository() {
        List<Long> ids = java.util.stream.LongStream.rangeClosed(1, 101).boxed().toList();

        assertThatThrownBy(() -> service().getProductsByIds(ids)).isInstanceOf(TooManyIdsException.class);

        verify(productRepository, never()).findAllByIdInAndActiveTrueAndDeletedAtIsNullOrderByIdAsc(any());
    }

    @Test
    void categoriesWithoutSearchTermAreAllListed() {
        when(categoryRepository.findAllByOrderByIdAsc()).thenReturn(List.of(CEVICHES));

        assertThat(service().listCategories(null)).hasSize(1);
        assertThat(service().listCategories("   ")).hasSize(1);

        verify(categoryRepository, never()).findAllWithActiveMatch(any());
    }

    @Test
    void categoriesWithSearchTermAreFilteredWithTheNormalizedPattern() {
        when(categoryRepository.findAllWithActiveMatch("%ceviche%")).thenReturn(List.of(CEVICHES));

        List<CategoryResponse> result = service().listCategories("  CEVICHÉ ");

        assertThat(result).extracting(CategoryResponse::slug).containsExactly("ceviches");
        verify(categoryRepository, never()).findAllByOrderByIdAsc();
    }
}
