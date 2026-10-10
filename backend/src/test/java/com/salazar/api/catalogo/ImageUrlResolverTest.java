package com.salazar.api.catalogo;

import static org.assertj.core.api.Assertions.assertThat;

import com.salazar.api.common.config.StorageProperties;
import org.junit.jupiter.api.Test;

class ImageUrlResolverTest {
    private static ImageUrlResolver resolver(String publicBaseUrl) {
        return new ImageUrlResolver(
                new StorageProperties("http://s3.test", "garage", "key", "secret", "platos", publicBaseUrl));
    }

    @Test
    void joinsBaseAndPathWithoutBucket() {
        assertThat(resolver("https://media.cevicheria-salazar.com").resolve("seed/ceviches.svg"))
                .isEqualTo("https://media.cevicheria-salazar.com/seed/ceviches.svg");
    }

    @Test
    void avoidsDoubleSlashes() {
        assertThat(resolver("http://platos.web.garage.localhost:3902/").resolve("/ceviche.jpg"))
                .isEqualTo("http://platos.web.garage.localhost:3902/ceviche.jpg");
    }
}
