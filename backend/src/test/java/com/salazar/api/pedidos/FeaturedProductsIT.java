package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// Lives next to the order tests because best sellers come from real orders
class FeaturedProductsIT extends OrderITSupport {
    private static final String URL = "/api/products/featured";

    private final List<Long> hidden = new ArrayList<>();
    private long buyerId;

    // Products left by other test classes must not compete for the five slots
    @BeforeEach
    void isolateCatalog() throws Exception {
        hidden.addAll(jdbcTemplate.queryForList("SELECT id FROM products WHERE is_active", Long.class));
        jdbcTemplate.update("UPDATE products SET is_active = false WHERE is_active");
        Customer buyer = register();
        buyerId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, buyer.email());
    }

    @AfterEach
    void restoreCatalog() {
        for (Long id : hidden) jdbcTemplate.update("UPDATE products SET is_active = true WHERE id = ?", id);
        hidden.clear();
    }

    private long dish(String name, String rating, Instant createdAt) {
        long id = product(name, "20.00", 10);
        jdbcTemplate.update(
                "UPDATE products SET rating = ?::numeric, created_at = ?::timestamptz WHERE id = ?",
                rating,
                createdAt.toString(),
                id);
        return id;
    }

    private void sale(long productId, int quantity, String status, Instant purchasedAt) {
        boolean paid = status.equals("PAGADO");
        long orderId = jdbcTemplate.queryForObject(
                "INSERT INTO orders (code, delivery_code, user_id, status, delivery_status, payment_method, delivery_type,"
                        + " address_reference, subtotal, discount, delivery_price, total, paid_at, created_at)"
                        + " VALUES (format('SAL-%s', lpad(nextval('order_code_seq')::text, 6, '0')), '1234', ?, ?,"
                        + " 'PENDIENTE', 'ONLINE', 'RECOJO', 'Puerta verde', 20, 0, 0, 20, ?::timestamptz, ?::timestamptz)"
                        + " RETURNING id",
                Long.class,
                buyerId,
                status,
                paid ? purchasedAt.toString() : null,
                purchasedAt.toString());
        jdbcTemplate.update(
                "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)"
                        + " SELECT ?, id, name, price, ?, price * ? FROM products WHERE id = ?",
                orderId,
                quantity,
                quantity,
                productId);
    }

    private JsonNode featured() throws Exception {
        return objectMapper.readTree(
                mockMvc.perform(get(URL)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private List<Long> ids(JsonNode items) {
        List<Long> ids = new ArrayList<>();
        items.forEach(item -> ids.add(item.get("id").asLong()));
        return ids;
    }

    @Test
    void bestSellersComeFirstAndTheBestRatedThenTheNewestFillTheRest() throws Exception {
        Instant now = Instant.now();
        Instant old = now.minus(10, ChronoUnit.DAYS);
        long top = dish("Ceviche clásico", null, old);
        long second = dish("Chicharrón de pescado", null, old);
        long rated = dish("Leche de tigre", "4.8", old);
        long fair = dish("Arroz con mariscos", "4.0", old);
        long newest = dish("Tiradito", null, now.minus(1, ChronoUnit.DAYS));
        dish("Causa", null, now.minus(2, ChronoUnit.DAYS));
        long soldOut = dish("Jalea", null, old);
        long unavailable = dish("Sudado", null, old);
        long unpaid = dish("Parihuela", null, old);
        long uncollected = dish("Ceviche de conchas negras", null, old);
        long cancelled = dish("Choritos", null, old);
        long tooOld = dish("Pulpo al olivo", null, old);

        sale(top, 2, "PAGADO", now.minus(1, ChronoUnit.DAYS));
        sale(top, 1, "PAGADO", now.minus(3, ChronoUnit.DAYS));
        sale(second, 1, "PAGADO", now.minus(5, ChronoUnit.DAYS));
        sale(soldOut, 9, "PAGADO", now.minus(1, ChronoUnit.DAYS));
        sale(unavailable, 9, "PAGADO", now.minus(1, ChronoUnit.DAYS));
        sale(unpaid, 9, "PENDIENTE_PAGO", now.minus(1, ChronoUnit.DAYS));
        sale(uncollected, 9, "PENDIENTE_COBRO", now.minus(1, ChronoUnit.DAYS));
        sale(cancelled, 9, "CANCELADO", now.minus(1, ChronoUnit.DAYS));
        sale(tooOld, 9, "PAGADO", now.minus(31, ChronoUnit.DAYS));
        jdbcTemplate.update("UPDATE products SET stock = 0 WHERE id = ?", soldOut);
        jdbcTemplate.update("UPDATE products SET is_available = false WHERE id = ?", unavailable);

        JsonNode items = featured();

        assertThat(ids(items)).containsExactly(top, second, rated, fair, newest);
        List<Boolean> bestSeller = new ArrayList<>();
        items.forEach(item -> bestSeller.add(item.get("bestSeller").asBoolean()));
        assertThat(bestSeller).containsExactly(true, true, false, false, false);
        assertThat(items.get(0).get("name").asText()).isEqualTo("Ceviche clásico");
        assertThat(items.get(0).get("price").decimalValue()).isEqualByComparingTo("20.00");
        assertThat(items.get(0).has("stock")).isTrue();
    }

    @Test
    void neverShowsMoreThanFiveEvenWithMoreBestSellers() throws Exception {
        Instant now = Instant.now();
        List<Long> dishes = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            long id = dish("Plato " + i, null, now);
            sale(id, 10 - i, "PAGADO", now.minus(1, ChronoUnit.DAYS));
            dishes.add(id);
        }

        JsonNode items = featured();

        assertThat(ids(items)).containsExactlyElementsOf(dishes.subList(0, 5));
        items.forEach(item -> assertThat(item.get("bestSeller").asBoolean()).isTrue());
    }

    @Test
    void withFewerThanThreeOrderableDishesThereIsNoSection() throws Exception {
        Instant now = Instant.now();
        long one = dish("Ceviche", null, now);
        dish("Chicharrón", null, now);
        long out = dish("Jalea", null, now);
        jdbcTemplate.update("UPDATE products SET stock = 0 WHERE id = ?", out);
        sale(one, 1, "PAGADO", now);

        assertThat(featured()).isEmpty();
        mockMvc.perform(get("/api/products/" + one)).andExpect(status().isOk());
    }
}
