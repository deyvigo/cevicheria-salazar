package com.salazar.api.pedidos;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.dto.RegisterRequest;
import com.salazar.api.common.mail.MailService;
import com.salazar.api.common.mail.OrderConfirmationMail;
import jakarta.servlet.http.Cookie;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, OrderITSupport.GatewayConfig.class})
@WithTestSecrets
@TestPropertySource(properties = "app.mercadopago.webhook-secret=" + OrderITSupport.WEBHOOK_SECRET)
abstract class OrderITSupport {
    static final String WEBHOOK_SECRET = "it-webhook-secret";
    private static final String SQUARE =
            "ST_GeomFromText('POLYGON((-77.04 -12.04, -77.02 -12.04, -77.02 -12.06, -77.04 -12.06, -77.04 -12.04))', 4326)";

    @TestConfiguration
    static class GatewayConfig {
        @Bean
        @Primary
        FakePaymentGateway fakePaymentGateway() {
            return new FakePaymentGateway();
        }
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @Autowired
    protected FakePaymentGateway gateway;

    // Confirmation emails leave through the async listener; no SMTP server in the tests
    @MockitoBean
    protected MailService mailService;

    protected final ObjectMapper objectMapper = new ObjectMapper();
    private final List<Long> createdProducts = new ArrayList<>();

    protected record Customer(String email, Cookie access) {}

    @BeforeEach
    void resetGateway() {
        gateway.reset();
        Mockito.clearInvocations(mailService);
    }

    @AfterEach
    void cleanOrders() {
        jdbcTemplate.update("DELETE FROM payments");
        jdbcTemplate.update("DELETE FROM order_items");
        jdbcTemplate.update("DELETE FROM orders");
        jdbcTemplate.update("DELETE FROM delivery_zones");
        for (Long id : createdProducts) {
            jdbcTemplate.update("DELETE FROM products WHERE id = ?", id);
        }
        createdProducts.clear();
    }

    protected Customer register() throws Exception {
        String email = "pedidos-" + UUID.randomUUID() + "@correo.com";
        String phone = "9" + String.format("%08d", Math.abs(UUID.randomUUID().getLeastSignificantBits()) % 100_000_000);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(email, "clave1234", "María", "Quispe", phone))))
                .andExpect(status().isCreated())
                .andReturn();
        return new Customer(email, result.getResponse().getCookie("access_token"));
    }

    protected long product(String name, String price, int stock) {
        Long categoryId = jdbcTemplate.queryForObject("SELECT id FROM categories LIMIT 1", Long.class);
        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO products (name, description, price, category_id, stock) VALUES (?, 'd', ?::numeric, ?, ?) RETURNING id",
                Long.class,
                name,
                price,
                categoryId,
                stock);
        createdProducts.add(id);
        return id;
    }

    protected void zone(String price) {
        jdbcTemplate.update(
                "INSERT INTO delivery_zones (name, price, color, area, active) VALUES ('Centro', " + price + ", 'lima', "
                        + SQUARE + ", true)");
    }

    protected long address(Customer customer, double latitude, double longitude) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("label", "Casa");
        body.put("address", "Av. Arequipa 123, Lince");
        body.put("reference", "Puerta verde");
        body.put("latitude", latitude);
        body.put("longitude", longitude);
        MvcResult result = mockMvc.perform(post("/api/profile/addresses")
                        .cookie(customer.access())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    protected long addressInsideZone(Customer customer) throws Exception {
        return address(customer, -12.05, -77.03);
    }

    protected long addressOutsideZone(Customer customer) throws Exception {
        return address(customer, -12.20, -77.20);
    }

    protected String orderBody(String deliveryType, Long addressId, String paymentMethod, long[]... items)
            throws Exception {
        List<Map<String, Object>> list = new ArrayList<>();
        for (long[] item : items) {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("productId", item[0]);
            line.put("quantity", item[1]);
            list.add(line);
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", list);
        body.put("deliveryType", deliveryType);
        body.put("addressId", addressId);
        body.put("paymentMethod", paymentMethod);
        return objectMapper.writeValueAsString(body);
    }

    protected MvcResult createOrder(Customer customer, String body, int expectedStatus) throws Exception {
        return mockMvc.perform(post("/api/orders")
                        .cookie(customer.access())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is(expectedStatus))
                .andReturn();
    }

    protected long createOnlineOrder(Customer customer, String body) throws Exception {
        MvcResult result = createOrder(customer, body, 201);
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("orderId").asLong();
    }

    protected int stockOf(long productId) {
        return jdbcTemplate.queryForObject("SELECT stock FROM products WHERE id = ?", Integer.class, productId);
    }

    protected String statusOf(long orderId) {
        return jdbcTemplate.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, orderId);
    }

    protected OrderConfirmationMail confirmationEmail() {
        ArgumentCaptor<OrderConfirmationMail> captor = ArgumentCaptor.forClass(OrderConfirmationMail.class);
        Mockito.verify(mailService, Mockito.timeout(5000).times(1)).sendOrderConfirmationEmail(captor.capture());
        return captor.getValue();
    }

    protected void assertNoConfirmationEmail() {
        Mockito.verify(mailService, Mockito.after(500).never()).sendOrderConfirmationEmail(Mockito.any());
    }

    protected void assertSingleConfirmationEmail() {
        Mockito.verify(mailService, Mockito.after(500).times(1)).sendOrderConfirmationEmail(Mockito.any());
    }
}
