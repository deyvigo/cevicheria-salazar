package com.salazar.api.catalogo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class CatalogSchemaIT {
    @Autowired
    private JdbcTemplate jdbc;

    private long categoryId(String slug) {
        return jdbc.queryForObject("SELECT id FROM categories WHERE slug = ?", Long.class, slug);
    }

    @Test
    void seedHasTheFiveCategoriesWithSlugs() {
        List<String> slugs = jdbc.queryForList("SELECT slug FROM categories ORDER BY id", String.class);

        assertThat(slugs).containsExactly("entradas", "ceviches", "chicharrones", "fondos", "bebidas");
    }

    @Test
    void ratingAboveFiveIsRejected() {
        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO products (name, description, price, category_id, rating) VALUES ('X', 'd', 1, ?, 5.1)",
                        categoryId("ceviches")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void ratingOfExactlyFiveAndNullAreAccepted() {
        long category = categoryId("ceviches");

        jdbc.update("INSERT INTO products (name, description, price, category_id, rating) VALUES ('Cinco', 'd', 1, ?, 5.0)", category);
        jdbc.update("INSERT INTO products (name, description, price, category_id, rating) VALUES ('Sin rating', 'd', 1, ?, NULL)", category);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM products WHERE name IN ('Cinco', 'Sin rating')", Integer.class))
                .isEqualTo(2);
    }

    @Test
    void categoryNameIsUniqueIgnoringCase() {
        assertThatThrownBy(() -> jdbc.update("INSERT INTO categories (name, slug) VALUES ('BEBIDAS', 'otra-bebida')"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingAProductDeletesItsImages() {
        long category = categoryId("fondos");
        Long productId = jdbc.queryForObject(
                "INSERT INTO products (name, description, price, category_id) VALUES ('Borrable', 'd', 1, ?) RETURNING id",
                Long.class,
                category);
        jdbc.update("INSERT INTO product_images (product_id, path) VALUES (?, 'platos/borrable.jpg')", productId);

        jdbc.update("DELETE FROM products WHERE id = ?", productId);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM product_images WHERE product_id = ?", Integer.class, productId))
                .isZero();
    }

    @Test
    void productsAreAvailableByDefaultAndAvailabilityIsNotNullable() {
        long category = categoryId("fondos");

        Boolean available = jdbc.queryForObject(
                "INSERT INTO products (name, description, price, category_id) VALUES ('Por defecto', 'd', 1, ?) RETURNING is_available",
                Boolean.class,
                category);

        assertThat(available).isTrue();
        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO products (name, description, price, category_id, is_available) VALUES ('Nulo', 'd', 1, ?, NULL)",
                        category))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
