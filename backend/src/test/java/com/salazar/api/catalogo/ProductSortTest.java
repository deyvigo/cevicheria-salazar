package com.salazar.api.catalogo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

class ProductSortTest {
    @Test
    void mapsEachPublicValue() {
        assertThat(ProductSort.from("price_asc")).isEqualTo(ProductSort.PRICE_ASC);
        assertThat(ProductSort.from("price_desc")).isEqualTo(ProductSort.PRICE_DESC);
        assertThat(ProductSort.from("rating_asc")).isEqualTo(ProductSort.RATING_ASC);
        assertThat(ProductSort.from("rating_desc")).isEqualTo(ProductSort.RATING_DESC);
        assertThat(ProductSort.from("name_asc")).isEqualTo(ProductSort.NAME_ASC);
        assertThat(ProductSort.from("name_desc")).isEqualTo(ProductSort.NAME_DESC);
    }

    @Test
    void unknownOrMissingValueFallsBackToNameAscending() {
        assertThat(ProductSort.from(null)).isEqualTo(ProductSort.NAME_ASC);
        assertThat(ProductSort.from("xyz")).isEqualTo(ProductSort.NAME_ASC);
    }

    @Test
    void alwaysEndsWithNameAndIdTieBreakers() {
        Sort sort = ProductSort.PRICE_DESC.toSort();

        assertThat(sort.stream().map(Sort.Order::getProperty)).containsExactly("price", "name", "id");
    }

    @Test
    void ratingPutsNullsLastInBothDirections() {
        Sort.Order desc = ProductSort.RATING_DESC.toSort().getOrderFor("rating");
        Sort.Order asc = ProductSort.RATING_ASC.toSort().getOrderFor("rating");

        assertThat(desc.isDescending()).isTrue();
        assertThat(asc.isAscending()).isTrue();
        assertThat(desc.getNullHandling()).isEqualTo(Sort.NullHandling.NULLS_LAST);
        assertThat(asc.getNullHandling()).isEqualTo(Sort.NullHandling.NULLS_LAST);
    }
}
