package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

class OrderHistoryIT extends OrderITSupport {
    private static final String URL = "/api/pedidos";

    private long dish(String name, int stock) {
        return product(name + " " + UUID.randomUUID(), "30.00", stock);
    }

    private long paidOrder(Customer customer, long dish, String paidAt) throws Exception {
        long id = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}));
        jdbcTemplate.update(
                "UPDATE orders SET status = 'PAGADO', paid_at = ?::timestamptz WHERE id = ?", paidAt, id);
        return id;
    }

    private JsonNode list(Customer customer, String page) throws Exception {
        MvcResult result = mockMvc.perform(get(URL + (page == null ? "" : "?page=" + page)).cookie(customer.access()))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    @Test
    void withoutSessionItIsUnauthorizedAndAnAdministratorIsForbidden() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());

        Customer admin = register();
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", admin.email());
        mockMvc.perform(get(URL).cookie(admin.access())).andExpect(status().isForbidden());
    }

    @Test
    void aCustomerWithoutPurchasesGetsAnEmptyPage() throws Exception {
        JsonNode page = list(register(), null);

        assertThat(page.get("items")).isEmpty();
        assertThat(page.get("totalItems").asInt()).isZero();
    }

    @Test
    void listsOnlyPurchasedOrdersNewestFirstWithoutLeakingTheDeliveryCode() throws Exception {
        Customer customer = register();
        long ceviche = dish("Ceviche", 20);
        long chicha = dish("Chicha", 20);
        long older = paidOrder(customer, ceviche, "2026-11-01T10:00:00Z");
        long newer = paidOrder(customer, chicha, "2026-11-05T10:00:00Z");
        createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {ceviche, 1}));
        long cancelled = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {ceviche, 1}));
        jdbcTemplate.update("UPDATE orders SET status = 'CANCELADO' WHERE id = ?", cancelled);

        JsonNode page = list(customer, null);

        assertThat(page.get("totalItems").asInt()).isEqualTo(2);
        JsonNode items = page.get("items");
        assertThat(items.get(0).get("id").asLong()).isEqualTo(newer);
        assertThat(items.get(1).get("id").asLong()).isEqualTo(older);
        assertThat(items.get(0).get("itemNames").get(0).asText()).startsWith("Chicha ");
        assertThat(items.get(0).get("total").decimalValue()).isEqualByComparingTo("30.00");
        assertThat(items.get(0).get("deliveryStatus").asText()).isEqualTo("EN_PREPARACION");
        assertThat(items.get(0).get("code").asText()).startsWith("SAL-");
        assertThat(items.get(0).has("deliveryCode")).isFalse();
    }

    @Test
    void aCashOnDeliveryOrderIsListedByItsCreationDate() throws Exception {
        Customer customer = register();
        long dish = dish("Ceviche", 20);
        ObjectNode body = (ObjectNode) objectMapper.readTree(
                orderBody("RECOJO", null, "CONTRAENTREGA", new long[] {dish, 1}));
        body.set("collection", objectMapper.readTree("{\"method\":\"YAPE\"}"));
        createOrder(customer, objectMapper.writeValueAsString(body), 201);

        JsonNode item = list(customer, null).get("items").get(0);

        assertThat(item.get("deliveryStatus").asText()).isEqualTo("EN_PREPARACION");
        assertThat(item.get("purchasedAt").asText()).isNotBlank();
    }

    @Test
    void onlyReturnsTheOrdersOfTheCustomerAsking() throws Exception {
        Customer mine = register();
        Customer other = register();
        long dish = dish("Ceviche", 20);
        long mineId = paidOrder(mine, dish, "2026-11-01T10:00:00Z");
        paidOrder(other, dish, "2026-11-02T10:00:00Z");

        JsonNode page = list(mine, null);

        assertThat(page.get("items")).hasSize(1);
        assertThat(page.get("items").get(0).get("id").asLong()).isEqualTo(mineId);
    }

    @Test
    void paginatesTenAtATimeWithoutRepeatingOrSkippingAndFallsBackToTheLastPage() throws Exception {
        Customer customer = register();
        long dish = dish("Ceviche", 50);
        for (int i = 1; i <= 12; i++) {
            // Same instant for all: the id breaks the tie so the pages stay stable
            paidOrder(customer, dish, "2026-11-01T10:00:00Z");
        }

        JsonNode first = list(customer, "1");
        JsonNode second = list(customer, "2");

        assertThat(first.get("items")).hasSize(10);
        assertThat(second.get("items")).hasSize(2);
        assertThat(first.get("totalPages").asInt()).isEqualTo(2);
        assertThat(first.get("items").get(9).get("id").asLong())
                .isGreaterThan(second.get("items").get(0).get("id").asLong());

        JsonNode beyond = list(customer, "9");
        assertThat(beyond.get("page").asInt()).isEqualTo(2);
        assertThat(beyond.get("items")).hasSize(2);

        assertThat(list(customer, "0").get("page").asInt()).isEqualTo(1);
        assertThat(list(customer, "-3").get("page").asInt()).isEqualTo(1);
    }

    @Test
    void anOrderBecomesVisibleOnceItIsPaid() throws Exception {
        Customer customer = register();
        long dish = dish("Ceviche", 20);
        long id = createOnlineOrder(customer, orderBody("RECOJO", null, "ONLINE", new long[] {dish, 1}));
        assertThat(list(customer, null).get("items")).isEmpty();

        jdbcTemplate.update("UPDATE orders SET status = 'PAGADO', paid_at = now() WHERE id = ?", id);

        assertThat(list(customer, null).get("items")).hasSize(1);
    }
}
