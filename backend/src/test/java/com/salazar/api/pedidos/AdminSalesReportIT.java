package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AdminSalesReportIT extends OrderITSupport {
    private static final String URL = "/api/admin/reports/sales";
    private static final String RANGE = "?from=2026-11-01&to=2026-11-07";

    private Customer admin;
    private Customer buyer;
    private long buyerId;

    @BeforeEach
    void users() throws Exception {
        admin = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", admin.email());
        buyer = register();
        buyerId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, buyer.email());
    }

    /** {@code payment} is ONLINE, EFECTIVO or YAPE; dates are Lima local times. */
    private record Seed(
            String status,
            String delivery,
            String payment,
            String type,
            String total,
            String discount,
            String paidAt,
            String createdAt,
            String refund) {
        static Seed online(String paidAt, String total) {
            return new Seed("PAGADO", "ENTREGADO", "ONLINE", "RECOJO", total, "0.00", paidAt, paidAt, null);
        }

        static Seed cash(String method, String total, String createdAt) {
            return new Seed("PENDIENTE_COBRO", "CONFIRMADO", method, "RECOJO", total, "0.00", null, createdAt, null);
        }

        Seed delivery(String value) {
            return new Seed(status, value, payment, type, total, discount, paidAt, createdAt, refund);
        }

        Seed status(String value) {
            return new Seed(value, delivery, payment, type, total, discount, paidAt, createdAt, refund);
        }

        Seed paidAt(String value) {
            return new Seed(status, delivery, payment, type, total, discount, value, createdAt, refund);
        }

        Seed type(String value) {
            return new Seed(status, delivery, payment, value, total, discount, paidAt, createdAt, refund);
        }

        Seed discount(String value) {
            return new Seed(status, delivery, payment, type, total, value, paidAt, createdAt, refund);
        }

        Seed refund(String value) {
            return new Seed(status, delivery, payment, type, total, discount, paidAt, createdAt, value);
        }
    }

    private long insert(Seed seed) {
        boolean cash = !seed.payment().equals("ONLINE");
        boolean delivery = seed.type().equals("ENTREGA");
        return jdbcTemplate.queryForObject(
                "INSERT INTO orders (code, delivery_code, user_id, status, delivery_status, payment_method, delivery_type,"
                        + " address_text, address_reference, delivery_zone_name, subtotal, discount, delivery_price, total,"
                        + " collection_method, paid_at, created_at, refund_status)"
                        + " VALUES (format('SAL-%s', lpad(nextval('order_code_seq')::text, 6, '0')), '1234', ?, ?, ?, ?, ?,"
                        + " ?, ?, ?, ?::numeric, ?::numeric, 0, ?::numeric, ?, ?::timestamptz, ?::timestamptz, ?) RETURNING id",
                Long.class,
                buyerId,
                seed.status(),
                seed.delivery(),
                cash ? "CONTRAENTREGA" : "ONLINE",
                seed.type(),
                delivery ? "Av. Arequipa 123" : null,
                delivery ? "Puerta verde" : null,
                delivery ? "Centro" : null,
                seed.total(),
                seed.discount(),
                seed.total(),
                cash ? seed.payment() : null,
                seed.paidAt(),
                seed.createdAt(),
                seed.refund());
    }

    private void item(long orderId, long productId, String name, int quantity, String lineTotal) {
        jdbcTemplate.update(
                "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)"
                        + " VALUES (?, ?, ?, ?::numeric / ?, ?, ?::numeric)",
                orderId, productId, name, lineTotal, quantity, quantity, lineTotal);
    }

    private JsonNode report(String query) throws Exception {
        String body = mockMvc.perform(get(URL + query).cookie(admin.access()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(body);
    }

    private static List<String> text(JsonNode array, String field) {
        return array.findValues(field).stream().map(JsonNode::asText).toList();
    }

    @Test
    void requiresAnAdministrator() throws Exception {
        mockMvc.perform(get(URL + RANGE)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(URL + RANGE).cookie(buyer.access())).andExpect(status().isForbidden());
    }

    @Test
    void rejectsInvalidParameters() throws Exception {
        for (String query : List.of(
                "",
                "?from=2026-11-01",
                "?from=2026-11-08&to=2026-11-01",
                "?from=2026-01-01&to=2027-01-02",
                "?from=hoy&to=2026-11-01",
                RANGE + "&payment=TARJETA",
                RANGE + "&type=DRIVE")) {
            mockMvc.perform(get(URL + query).cookie(admin.access())).andExpect(status().isBadRequest());
        }
        mockMvc.perform(get(URL + "?from=2026-01-01&to=2026-12-31").cookie(admin.access())).andExpect(status().isOk());
    }

    @Test
    void countsOnlyOrdersWhoseMoneyCameInAndWasNotReturned() throws Exception {
        insert(Seed.online("2026-11-02 12:00-05", "40.00"));
        insert(Seed.online("2026-11-03 12:00-05", "20.00").discount("5.00").delivery("FALLIDO"));
        insert(Seed.online("2026-11-03 13:00-05", "99.00").delivery("RECHAZADO").refund("PENDIENTE"));
        insert(Seed.online("2026-11-03 14:00-05", "98.00").delivery("CANCELADO").refund("REEMBOLSADO"));
        insert(Seed.online("2026-11-03 15:00-05", "97.00").status("PENDIENTE_PAGO").paidAt(null));
        insert(Seed.online("2026-11-03 16:00-05", "96.00").status("CANCELADO").paidAt(null));
        insert(Seed.cash("EFECTIVO", "95.00", "2026-11-03 17:00-05"));

        JsonNode summary = report(RANGE).get("summary");

        assertThat(summary.get("revenue").decimalValue()).isEqualByComparingTo("60.00");
        assertThat(summary.get("orders").asInt()).isEqualTo(2);
        assertThat(summary.get("averageTicket").decimalValue()).isEqualByComparingTo("30.00");
        assertThat(summary.get("discounts").decimalValue()).isEqualByComparingTo("5.00");
    }

    @Test
    void cashOnDeliveryCountsOnTheDayItWasCollectedAndFailedOnesNeverDo() throws Exception {
        insert(Seed.cash("EFECTIVO", "30.00", "2026-11-02 12:00-05")
                .status("PAGADO")
                .delivery("ENTREGADO")
                .paidAt("2026-11-03 20:00-05"));
        insert(Seed.cash("YAPE", "25.00", "2026-11-03 12:00-05"));
        insert(Seed.cash("YAPE", "24.00", "2026-11-03 12:00-05").delivery("FALLIDO"));
        insert(Seed.cash("EFECTIVO", "23.00", "2026-11-03 12:00-05").delivery("CANCELADO"));
        insert(Seed.cash("EFECTIVO", "22.00", "2026-11-03 12:00-05").delivery("RECHAZADO"));

        JsonNode report = report(RANGE);

        assertThat(report.get("summary").get("revenue").decimalValue()).isEqualByComparingTo("30.00");
        assertThat(report.get("summary").get("pendingCollection").decimalValue()).isEqualByComparingTo("25.00");
        JsonNode series = report.get("series");
        assertThat(series.get(1).get("revenue").decimalValue()).isEqualByComparingTo("0.00");
        assertThat(series.get(2).get("revenue").decimalValue()).isEqualByComparingTo("30.00");
    }

    @Test
    void groupsByLimaDayAndIncludesTheWholeLastDay() throws Exception {
        insert(Seed.online("2026-11-01 00:00:00-05", "10.00"));
        insert(Seed.online("2026-11-01 21:00:00-05", "20.00"));
        insert(Seed.online("2026-11-07 23:59:59-05", "30.00"));
        insert(Seed.online("2026-11-08 00:00:00-05", "40.00"));
        insert(Seed.online("2026-10-31 23:59:59-05", "50.00"));

        JsonNode report = report(RANGE);

        assertThat(report.get("granularity").asText()).isEqualTo("DAY");
        JsonNode series = report.get("series");
        assertThat(series).hasSize(7);
        assertThat(series.get(0).get("date").asText()).isEqualTo("2026-11-01");
        assertThat(series.get(0).get("revenue").decimalValue()).isEqualByComparingTo("30.00");
        assertThat(series.get(0).get("orders").asInt()).isEqualTo(2);
        assertThat(series.get(1).get("orders").asInt()).isZero();
        assertThat(series.get(6).get("revenue").decimalValue()).isEqualByComparingTo("30.00");
        assertThat(report.get("summary").get("revenue").decimalValue()).isEqualByComparingTo("60.00");
    }

    @Test
    void groupsLongRangesByWeekAndMonth() throws Exception {
        insert(Seed.online("2026-11-04 12:00-05", "10.00"));
        insert(Seed.online("2026-11-05 12:00-05", "20.00"));

        JsonNode weekly = report("?from=2026-10-01&to=2026-11-15");
        assertThat(weekly.get("granularity").asText()).isEqualTo("WEEK");
        JsonNode week = weekly.get("series").get(5);
        assertThat(week.get("date").asText()).isEqualTo("2026-11-02");
        assertThat(week.get("revenue").decimalValue()).isEqualByComparingTo("30.00");

        JsonNode monthly = report("?from=2026-01-01&to=2026-11-30");
        assertThat(monthly.get("granularity").asText()).isEqualTo("MONTH");
        assertThat(monthly.get("series")).hasSize(11);
        assertThat(monthly.get("series").get(10).get("orders").asInt()).isEqualTo(2);
    }

    @Test
    void splitsTheRevenueByPaymentMethod() throws Exception {
        insert(Seed.online("2026-11-02 12:00-05", "50.00"));
        insert(Seed.cash("EFECTIVO", "30.00", "2026-11-02 12:00-05").status("PAGADO").delivery("ENTREGADO").paidAt("2026-11-02 14:00-05"));
        insert(Seed.cash("YAPE", "20.00", "2026-11-02 12:00-05").status("PAGADO").delivery("ENTREGADO").paidAt("2026-11-02 15:00-05"));

        JsonNode shares = report(RANGE).get("byPayment");

        assertThat(text(shares, "method")).containsExactly("ONLINE", "EFECTIVO", "YAPE");
        assertThat(text(shares, "percentage")).containsExactly("50.0", "30.0", "20.0");
        assertThat(text(shares, "orders")).containsExactly("1", "1", "1");
    }

    @Test
    void filtersByMethodAndByDeliveryType() throws Exception {
        insert(Seed.online("2026-11-02 12:00-05", "50.00").type("ENTREGA"));
        insert(Seed.online("2026-11-02 13:00-05", "30.00"));
        insert(Seed.cash("YAPE", "20.00", "2026-11-02 12:00-05").status("PAGADO").delivery("ENTREGADO").paidAt("2026-11-02 14:00-05"));

        assertThat(report(RANGE + "&payment=ONLINE").get("summary").get("revenue").decimalValue()).isEqualByComparingTo("80.00");
        assertThat(report(RANGE + "&payment=YAPE").get("summary").get("revenue").decimalValue()).isEqualByComparingTo("20.00");
        assertThat(report(RANGE + "&payment=EFECTIVO").get("summary").get("orders").asInt()).isZero();
        assertThat(report(RANGE + "&type=ENTREGA").get("summary").get("revenue").decimalValue()).isEqualByComparingTo("50.00");
        assertThat(report(RANGE + "&payment=ONLINE&type=RECOJO").get("summary").get("revenue").decimalValue()).isEqualByComparingTo("30.00");
    }

    @Test
    void pendingRefundsIgnoreTheDateRangeButNotTheFilters() throws Exception {
        insert(Seed.online("2026-06-02 12:00-05", "45.00").delivery("RECHAZADO").refund("PENDIENTE"));
        insert(Seed.online("2026-11-02 12:00-05", "15.00").delivery("CANCELADO").refund("PENDIENTE").type("ENTREGA"));
        insert(Seed.online("2026-11-02 13:00-05", "99.00").delivery("CANCELADO").refund("REEMBOLSADO"));

        JsonNode all = report(RANGE).get("summary").get("pendingRefunds");
        assertThat(all.get("count").asInt()).isEqualTo(2);
        assertThat(all.get("amount").decimalValue()).isEqualByComparingTo("60.00");
        JsonNode delivery = report(RANGE + "&type=ENTREGA").get("summary").get("pendingRefunds");
        assertThat(delivery.get("count").asInt()).isEqualTo(1);
        assertThat(delivery.get("amount").decimalValue()).isEqualByComparingTo("15.00");
    }

    @Test
    void ranksTheTenBestSellingDishesAndKeepsTheStoredName() throws Exception {
        long ceviche = product("Ceviche clásico", "30.00", 10);
        long soldOut = product("Plato retirado", "10.00", 10);
        long order = insert(Seed.online("2026-11-02 12:00-05", "200.00"));
        long returned = insert(Seed.online("2026-11-02 12:00-05", "999.00").delivery("RECHAZADO").refund("PENDIENTE"));
        item(order, ceviche, "Ceviche clásico", 5, "150.00");
        item(order, soldOut, "Plato retirado", 5, "50.00");
        item(returned, ceviche, "Ceviche clásico", 40, "999.00");
        for (int i = 1; i <= 11; i++) {
            item(order, ceviche, String.format("Plato %02d", i), 1, "1.00");
        }
        jdbcTemplate.update("UPDATE products SET deleted_at = now() WHERE id = ?", soldOut);

        JsonNode dishes = report(RANGE).get("topDishes");

        assertThat(dishes).hasSize(10);
        assertThat(text(dishes, "name").subList(0, 3)).containsExactly("Ceviche clásico", "Plato retirado", "Plato 01");
        assertThat(dishes.get(0).get("units").asInt()).isEqualTo(5);
        assertThat(dishes.get(1).get("revenue").decimalValue()).isEqualByComparingTo("50.00");
    }

    @Test
    void anEmptyRangeReturnsZerosAndNoRows() throws Exception {
        JsonNode report = report(RANGE);

        assertThat(report.get("summary").get("revenue").decimalValue()).isEqualByComparingTo("0.00");
        assertThat(report.get("summary").get("averageTicket").decimalValue()).isEqualByComparingTo("0.00");
        assertThat(report.get("series")).hasSize(7);
        assertThat(report.get("byPayment")).hasSize(3);
        assertThat(report.get("topDishes")).isEmpty();
    }
}
