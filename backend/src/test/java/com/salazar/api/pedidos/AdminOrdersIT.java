package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

class AdminOrdersIT extends OrderITSupport {
    private static final String URL = "/api/admin/orders";

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

    private record Seed(String status, String delivery, String type, String zone, String collection, String total, String paidAt) {
        static Seed paid(String paidAt) {
            return new Seed("PAGADO", "EN_PREPARACION", "RECOJO", null, null, "30.00", paidAt);
        }

        Seed delivery(String value) {
            return new Seed(status, value, type, zone, collection, total, paidAt);
        }

        Seed zone(String value) {
            return new Seed(status, delivery, "ENTREGA", value, collection, total, paidAt);
        }

        Seed cash(String method, String amount) {
            return new Seed("PENDIENTE_COBRO", delivery, type, zone, method, total, paidAt);
        }

        Seed total(String value) {
            return new Seed(status, delivery, type, zone, collection, value, paidAt);
        }

        Seed status(String value) {
            return new Seed(value, delivery, type, zone, collection, total, paidAt);
        }
    }

    private long insert(long userId, Seed seed) {
        String payment = seed.collection() == null ? "ONLINE" : "CONTRAENTREGA";
        String address = seed.type().equals("ENTREGA") ? "'Av. Arequipa 123'" : "NULL";
        return jdbcTemplate.queryForObject(
                "INSERT INTO orders (code, delivery_code, user_id, status, delivery_status, payment_method, delivery_type,"
                        + " address_text, address_reference, delivery_zone_name, subtotal, discount, delivery_price, total,"
                        + " collection_method, cash_amount, paid_at, created_at)"
                        + " VALUES (format('SAL-%s', lpad(nextval('order_code_seq')::text, 6, '0')), '1234', ?, ?, ?, ?, ?,"
                        + " " + address + ", 'Puerta verde', ?, ?::numeric, 0, 0, ?::numeric, ?, "
                        + (seed.collection() != null && seed.collection().equals("EFECTIVO") ? "100" : "NULL")
                        + ", " + (seed.status().equals("PAGADO") ? "?::timestamptz" : "NULL") + ", ?::timestamptz) RETURNING id",
                Long.class,
                seed.status().equals("PAGADO")
                        ? new Object[] {userId, seed.status(), seed.delivery(), payment, seed.type(), seed.zone(), seed.total(), seed.total(), seed.collection(), seed.paidAt(), seed.paidAt()}
                        : new Object[] {userId, seed.status(), seed.delivery(), payment, seed.type(), seed.zone(), seed.total(), seed.total(), seed.collection(), seed.paidAt()});
    }

    private JsonNode list(String query) throws Exception {
        MvcResult result = mockMvc.perform(get(URL + query).cookie(admin.access()))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private List<Long> ids(JsonNode page) {
        List<Long> ids = new ArrayList<>();
        page.get("items").forEach(item -> ids.add(item.get("id").asLong()));
        return ids;
    }

    @Test
    void everyRouteRequiresAnAdministrator() throws Exception {
        for (String path : List.of(URL, URL + "/zones", URL + "/1", URL + "/events")) {
            mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
            mockMvc.perform(get(path).cookie(buyer.access())).andExpect(status().isForbidden());
        }
        mockMvc.perform(patch(URL + "/1/delivery-status?from=EN_PREPARACION")).andExpect(status().isUnauthorized());
        mockMvc.perform(patch(URL + "/1/delivery-status?from=EN_PREPARACION").cookie(buyer.access()))
                .andExpect(status().isForbidden());
    }

    @Test
    void listsOnlyPurchasedActiveOrdersNewestFirstWithoutTheDeliveryCode() throws Exception {
        long older = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z"));
        long newer = insert(buyerId, Seed.paid("2026-11-05T10:00:00Z"));
        insert(buyerId, Seed.paid("2026-11-06T10:00:00Z").delivery("ENTREGADO"));
        insert(buyerId, Seed.paid("2026-11-07T10:00:00Z").status("PENDIENTE_PAGO"));
        insert(buyerId, Seed.paid("2026-11-08T10:00:00Z").status("CANCELADO"));

        JsonNode page = list("");

        assertThat(ids(page)).containsExactly(newer, older);
        assertThat(page.get("totalItems").asInt()).isEqualTo(2);
        JsonNode row = page.get("items").get(0);
        assertThat(row.get("code").asText()).startsWith("SAL-");
        assertThat(row.get("customerName").asText()).isEqualTo("María Quispe");
        assertThat(row.has("deliveryCode")).isFalse();
        assertThat(list("?deliveryStatus=ALL").get("totalItems").asInt()).isEqualTo(3);
        assertThat(list("?deliveryStatus=ENTREGADO").get("totalItems").asInt()).isEqualTo(1);
    }

    @Test
    void sortsByEachColumnAndKeepsPickupOrdersWithoutZoneLast() throws Exception {
        long a = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z").zone("Miraflores").total("50.00"));
        long b = insert(buyerId, Seed.paid("2026-11-02T10:00:00Z").zone("Barranco").total("20.00").delivery("EN_CAMINO"));
        long c = insert(buyerId, Seed.paid("2026-11-03T10:00:00Z").total("40.00"));

        assertThat(ids(list("?sort=date&dir=asc"))).containsExactly(a, b, c);
        assertThat(ids(list("?sort=total&dir=asc"))).containsExactly(b, c, a);
        assertThat(ids(list("?sort=total"))).containsExactly(a, c, b);
        assertThat(ids(list("?sort=zone&dir=asc"))).containsExactly(b, a, c);
        assertThat(ids(list("?sort=zone&dir=desc"))).containsExactly(a, b, c);
        assertThat(ids(list("?sort=deliveryStatus&dir=asc"))).containsExactly(c, a, b);
        assertThat(ids(list("?sort=deliveryStatus&dir=desc"))).containsExactly(b, c, a);
        assertThat(ids(list("?sort=code&dir=asc"))).containsExactly(a, b, c);
        assertThat(ids(list("?sort=unknown"))).containsExactly(c, b, a);
    }

    @Test
    void filtersByTypePaymentPaymentStatusAndZone() throws Exception {
        long pickup = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z"));
        long delivery = insert(buyerId, Seed.paid("2026-11-02T10:00:00Z").zone("Barranco"));
        long cash = insert(buyerId, Seed.paid("2026-11-03T10:00:00Z").cash("EFECTIVO", "100"));
        long yape = insert(buyerId, Seed.paid("2026-11-04T10:00:00Z").cash("YAPE", null));

        assertThat(ids(list("?type=RECOJO"))).containsExactlyInAnyOrder(pickup, cash, yape);
        assertThat(ids(list("?type=ENTREGA"))).containsExactly(delivery);
        assertThat(ids(list("?payment=ONLINE"))).containsExactlyInAnyOrder(pickup, delivery);
        assertThat(ids(list("?payment=EFECTIVO"))).containsExactly(cash);
        assertThat(ids(list("?payment=YAPE"))).containsExactly(yape);
        assertThat(ids(list("?paymentStatus=PENDIENTE_COBRO"))).containsExactlyInAnyOrder(cash, yape);
        assertThat(ids(list("?paymentStatus=PAGADO"))).containsExactlyInAnyOrder(pickup, delivery);
        assertThat(ids(list("?zone=Barranco"))).containsExactly(delivery);
        assertThat(ids(list("?type=RECOJO&payment=YAPE"))).containsExactly(yape);
        mockMvc.perform(get(URL + "/zones").cookie(admin.access()))
                .andExpect(status().isOk());
        assertThat(objectMapper.readTree(mockMvc.perform(get(URL + "/zones").cookie(admin.access())).andReturn().getResponse().getContentAsString()))
                .extracting(JsonNode::asText)
                .containsExactly("Barranco");
    }

    @Test
    void theCashChangeIsOnlyShownForCashWithAnAmount() throws Exception {
        long cash = insert(buyerId, Seed.paid("2026-11-03T10:00:00Z").cash("EFECTIVO", "100").total("92.00"));
        long yape = insert(buyerId, Seed.paid("2026-11-04T10:00:00Z").cash("YAPE", null));

        JsonNode page = list("?sort=date&dir=asc");

        assertThat(page.get("items").get(0).get("id").asLong()).isEqualTo(cash);
        assertThat(page.get("items").get(0).get("cashChange").decimalValue()).isEqualByComparingTo("8.00");
        assertThat(page.get("items").get(1).get("id").asLong()).isEqualTo(yape);
        assertThat(page.get("items").get(1).get("cashChange").isNull()).isTrue();
    }

    @Test
    void searchesByCodeWithOrWithoutPrefixAndByCustomerNameIgnoringAccents() throws Exception {
        long mine = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z"));
        Customer other = register();
        jdbcTemplate.update("UPDATE users SET first_name = 'José', last_name = 'Ñañez' WHERE email = ?", other.email());
        long otherId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, other.email());
        long theirs = insert(otherId, Seed.paid("2026-11-02T10:00:00Z"));
        String code = jdbcTemplate.queryForObject("SELECT code FROM orders WHERE id = ?", String.class, mine);

        assertThat(ids(list("?q=" + code))).containsExactly(mine);
        assertThat(ids(list("?q=" + code.toLowerCase()))).containsExactly(mine);
        assertThat(ids(list("?q=" + Long.parseLong(code.substring(4))))).contains(mine);
        assertThat(ids(list("?q=jose"))).containsExactly(theirs);
        assertThat(ids(list("?q=NAÑEZ"))).containsExactly(theirs);
        assertThat(ids(list("?q=quispe"))).containsExactly(mine);
        assertThat(ids(list("?q=zzz"))).isEmpty();
        assertThat(ids(list("?q=%25"))).isEmpty();
    }

    @Test
    void filtersByPurchaseDateInLimaTime() throws Exception {
        // 04:30 UTC on Nov 2 is 23:30 on Nov 1 in Lima
        long lateNight = insert(buyerId, Seed.paid("2026-11-02T04:30:00Z"));
        long nextDay = insert(buyerId, Seed.paid("2026-11-02T15:00:00Z"));
        long later = insert(buyerId, Seed.paid("2026-11-04T15:00:00Z"));

        assertThat(ids(list("?from=2026-11-02&to=2026-11-02"))).containsExactly(nextDay);
        assertThat(ids(list("?from=2026-11-01&to=2026-11-01"))).containsExactly(lateNight);
        assertThat(ids(list("?from=2026-11-02"))).containsExactlyInAnyOrder(nextDay, later);
        assertThat(ids(list("?to=2026-11-01"))).containsExactly(lateNight);
        mockMvc.perform(get(URL + "?from=2026-11-05&to=2026-11-01").cookie(admin.access()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(URL + "?from=nope").cookie(admin.access())).andExpect(status().isBadRequest());
    }

    @Test
    void paginatesTwentyAtATimeAndFallsBackToTheLastPage() throws Exception {
        for (int i = 0; i < 25; i++) {
            insert(buyerId, Seed.paid("2026-11-01T10:00:00Z"));
        }

        JsonNode first = list("?page=1");
        JsonNode second = list("?page=2");

        assertThat(first.get("items")).hasSize(20);
        assertThat(second.get("items")).hasSize(5);
        assertThat(first.get("totalPages").asInt()).isEqualTo(2);
        assertThat(first.get("items").get(19).get("id").asLong()).isGreaterThan(second.get("items").get(0).get("id").asLong());
        assertThat(list("?page=9").get("page").asInt()).isEqualTo(2);
        assertThat(list("?page=0").get("page").asInt()).isEqualTo(1);
    }

    @Test
    void theDetailShowsTheCustomerAndTheItemsButNeverTheDeliveryCode() throws Exception {
        long id = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z").zone("Barranco"));
        long dish = product("Ceviche " + id, "30.00", 5);
        jdbcTemplate.update(
                "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)"
                        + " VALUES (?, ?, 'Ceviche clásico', 30, 2, 60)",
                id, dish);

        MvcResult result = mockMvc.perform(get(URL + "/" + id).cookie(admin.access()))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);

        assertThat(json.get("customerPhone").asText()).isNotBlank();
        assertThat(json.get("addressText").asText()).isEqualTo("Av. Arequipa 123");
        assertThat(json.get("items").get(0).get("name").asText()).isEqualTo("Ceviche clásico");
        assertThat(json.get("items").get(0).get("lineTotal").decimalValue()).isEqualByComparingTo(new BigDecimal("60"));
        assertThat(body).doesNotContain("deliveryCode", "preferenceId", "initPoint");
    }

    @Test
    void anOrderThatIsNotPurchasedHasNoDetailAndCannotAdvance() throws Exception {
        long pending = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z").status("PENDIENTE_PAGO"));

        mockMvc.perform(get(URL + "/" + pending).cookie(admin.access())).andExpect(status().isNotFound());
        mockMvc.perform(patch(URL + "/" + pending + "/delivery-status?from=EN_PREPARACION").cookie(admin.access()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(URL + "/999999").cookie(admin.access())).andExpect(status().isNotFound());
    }

    @Test
    void advancesOneStepAtATimeAndRejectsStaleOrFinishedRequests() throws Exception {
        long id = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z"));
        String advance = URL + "/" + id + "/delivery-status";

        mockMvc.perform(patch(advance + "?from=EN_CAMINO").cookie(admin.access())).andExpect(status().isConflict());
        mockMvc.perform(patch(advance + "?from=NOPE").cookie(admin.access())).andExpect(status().isBadRequest());
        mockMvc.perform(patch(advance + "?from=EN_PREPARACION").cookie(admin.access())).andExpect(status().isOk());
        assertThat(deliveryOf(id)).isEqualTo("EN_CAMINO");

        // A second administrator still looking at the old row must not move it twice
        mockMvc.perform(patch(advance + "?from=EN_PREPARACION").cookie(admin.access())).andExpect(status().isConflict());
        assertThat(deliveryOf(id)).isEqualTo("EN_CAMINO");

        mockMvc.perform(patch(advance + "?from=EN_CAMINO").cookie(admin.access())).andExpect(status().isOk());
        mockMvc.perform(patch(advance + "?from=ENTREGADO").cookie(admin.access())).andExpect(status().isConflict());
        assertThat(deliveryOf(id)).isEqualTo("ENTREGADO");
    }

    @Test
    void twoSimultaneousAdvancesFromTheSameStageMoveTheOrderOnlyOnce() throws Exception {
        long id = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z"));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Callable<Integer> call = () -> mockMvc.perform(
                            patch(URL + "/" + id + "/delivery-status?from=EN_PREPARACION").cookie(admin.access()))
                    .andReturn()
                    .getResponse()
                    .getStatus();
            List<Integer> statuses = new ArrayList<>();
            for (var future : pool.invokeAll(List.of(call, call))) {
                statuses.add(future.get());
            }
            assertThat(statuses).containsExactlyInAnyOrder(200, 409);
            assertThat(deliveryOf(id)).isEqualTo("EN_CAMINO");
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void theStreamAcceptsCredentialedRequestsFromTheFrontendOrigin() throws Exception {
        mockMvc.perform(get(URL + "/events").cookie(admin.access()).header("Origin", "http://localhost:5173"))
                .andExpect(request().asyncStarted())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test
    void anOpenStreamIsToldWhenAnOrderChangesWithoutAnyOrderData() throws Exception {
        long id = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z"));
        MvcResult stream = mockMvc.perform(get(URL + "/events").cookie(admin.access()))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(patch(URL + "/" + id + "/delivery-status?from=EN_PREPARACION").cookie(admin.access()))
                .andExpect(status().isOk());

        String body = awaitContent(stream, "event:pedido-actualizado", "{\"orderId\":" + id + "}");
        assertThat(body).doesNotContain("María", "Av. Arequipa", "total");
    }

    @Test
    void aCashOnDeliveryOrderAnnouncesItselfAsSoonAsItIsPlaced() throws Exception {
        MvcResult stream = mockMvc.perform(get(URL + "/events").cookie(admin.access()))
                .andExpect(request().asyncStarted())
                .andReturn();
        long dish = product("Ceviche " + System.nanoTime(), "30.00", 5);
        String body = orderBody("RECOJO", null, "CONTRAENTREGA", new long[] {dish, 1})
                .replace("\"paymentMethod\"", "\"collection\":{\"method\":\"YAPE\"},\"paymentMethod\"");

        long id = objectMapper.readTree(createOrder(buyer, body, 201).getResponse().getContentAsString())
                .get("orderId")
                .asLong();

        awaitContent(stream, "event:pedido-creado", "{\"orderId\":" + id + "}");
    }

    @Test
    void aPanelThatReconnectsReceivesTheEventsItMissed() throws Exception {
        long first = insert(buyerId, Seed.paid("2026-11-01T10:00:00Z"));
        long second = insert(buyerId, Seed.paid("2026-11-02T10:00:00Z"));
        MvcResult before = mockMvc.perform(get(URL + "/events").cookie(admin.access()))
                .andExpect(request().asyncStarted())
                .andReturn();
        mockMvc.perform(patch(URL + "/" + first + "/delivery-status?from=EN_PREPARACION").cookie(admin.access()))
                .andExpect(status().isOk());
        String seen = awaitContent(before, "{\"orderId\":" + first + "}");
        String lastId = seen.lines().filter(line -> line.startsWith("id:")).reduce((a, b) -> b).orElseThrow().substring(3);

        // The panel is "offline" while the second order changes, then reconnects with the id of the last event it saw
        mockMvc.perform(patch(URL + "/" + second + "/delivery-status?from=EN_PREPARACION").cookie(admin.access()))
                .andExpect(status().isOk());
        MvcResult after = mockMvc.perform(get(URL + "/events").cookie(admin.access()).header("Last-Event-ID", lastId))
                .andExpect(request().asyncStarted())
                .andReturn();

        String replayed = awaitContent(after, "{\"orderId\":" + second + "}");
        assertThat(replayed).doesNotContain("{\"orderId\":" + first + "}");
        MvcResult stranger = mockMvc.perform(get(URL + "/events").cookie(admin.access()).header("Last-Event-ID", "not-a-number"))
                .andExpect(request().asyncStarted())
                .andReturn();
        awaitContent(stranger, "connected");
        assertThat(stranger.getResponse().getContentAsString()).doesNotContain("orderId");
    }

    // Events are written on their own thread, so the content shows up a moment after the change
    private String awaitContent(MvcResult stream, String... expected) throws Exception {
        long deadline = System.nanoTime() + 5_000_000_000L;
        while (true) {
            String body = stream.getResponse().getContentAsString();
            if (List.of(expected).stream().allMatch(body::contains)) return body;
            if (System.nanoTime() > deadline) throw new AssertionError("Missing " + List.of(expected) + " in:\n" + body);
            Thread.sleep(25);
        }
    }

    private String deliveryOf(long id) {
        return jdbcTemplate.queryForObject("SELECT delivery_status FROM orders WHERE id = ?", String.class, id);
    }
}
