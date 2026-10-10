package com.salazar.api.catalogo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ImageUrlResolverTest {
    @Test
    void joinsBaseBucketAndPath() {
        var resolver = new ImageUrlResolver("https://media.cevicheria-salazar.com", "platos");

        assertThat(resolver.resolve("platos/ceviche.jpg"))
                .isEqualTo("https://media.cevicheria-salazar.com/platos/platos/ceviche.jpg");
    }

    @Test
    void avoidsDoubleSlashes() {
        var resolver = new ImageUrlResolver("http://localhost:9000/", "platos/");

        assertThat(resolver.resolve("/ceviche.jpg")).isEqualTo("http://localhost:9000/platos/ceviche.jpg");
    }
}
