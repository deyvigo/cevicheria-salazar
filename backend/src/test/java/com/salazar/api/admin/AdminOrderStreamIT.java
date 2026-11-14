package com.salazar.api.admin;

import static org.assertj.core.api.Assertions.assertThat;

import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.pedidos.DeliveryStatus;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

// Real HTTP against the embedded server: MockMvc doesn't exercise the container's async dispatch.
// HttpURLConnection on purpose: the JDK HttpClient reads its restricted-header setting once per JVM, and StorageIT sets it.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class AdminOrderStreamIT {
    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AdminOrderService orderService;

    private HttpURLConnection stream;

    @AfterEach
    void clean() {
        if (stream != null) stream.disconnect();
        jdbcTemplate.update("DELETE FROM order_items");
        jdbcTemplate.update("DELETE FROM orders");
    }

    private HttpURLConnection open(String method, String path, String cookie) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) URI.create("http://localhost:" + port + path).toURL().openConnection();
        connection.setRequestMethod(method);
        if (cookie != null) connection.setRequestProperty("Cookie", cookie);
        return connection;
    }

    private String registerAndGetCookie(String email, String phone) throws Exception {
        HttpURLConnection connection = open("POST", "/api/auth/register", null);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setDoOutput(true);
        connection.getOutputStream().write(("{\"email\":\"" + email + "\",\"password\":\"clave1234\",\"firstName\":\"Ana\","
                        + "\"lastName\":\"Torres\",\"phone\":\"" + phone + "\"}")
                .getBytes(StandardCharsets.UTF_8));
        assertThat(connection.getResponseCode()).isEqualTo(201);
        return connection.getHeaderFields().get("Set-Cookie").stream()
                .filter(cookie -> cookie.startsWith("access_token="))
                .findFirst()
                .orElseThrow()
                .split(";")[0];
    }

    @Test
    void aRealClientReceivesTheEventsAndTheServerKeepsWorkingAfterItDisconnects() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String email = "stream-" + suffix + "@correo.com";
        String phone = "9" + String.format("%08d", Math.abs(UUID.randomUUID().getLeastSignificantBits()) % 100_000_000);
        String cookie = registerAndGetCookie(email, phone);
        jdbcTemplate.update("UPDATE users SET role = 'ADMINISTRADOR' WHERE email = ?", email);
        long userId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        long orderId = jdbcTemplate.queryForObject(
                "INSERT INTO orders (code, delivery_code, user_id, status, payment_method, delivery_type, subtotal, discount,"
                        + " delivery_price, total, paid_at) VALUES ('SAL-" + suffix.substring(0, 6)
                        + "', '1234', ?, 'PAGADO', 'ONLINE', 'RECOJO', 10, 0, 0, 10, now()) RETURNING id",
                Long.class,
                userId);

        stream = open("GET", "/api/admin/orders/events", cookie);
        stream.setRequestProperty("Accept", "text/event-stream");
        // disconnect() blocks while another thread is reading, so the reader gives up by itself after the events arrive
        stream.setReadTimeout(2000);
        assertThat(stream.getResponseCode()).isEqualTo(200);
        assertThat(stream.getContentType()).startsWith("text/event-stream");

        List<String> lines = new CopyOnWriteArrayList<>();
        Thread reader = new Thread(() -> {
            try (BufferedReader in = new BufferedReader(new InputStreamReader(stream.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = in.readLine()) != null) lines.add(line);
            } catch (IOException ignored) {
                // The test closes the connection
            }
        });
        reader.setDaemon(true);
        reader.start();

        waitFor(() -> lines.stream().anyMatch(line -> line.contains("connected")));

        orderService.advance(orderId, DeliveryStatus.EN_PREPARACION);

        waitFor(() -> lines.contains("event:pedido-actualizado") && lines.contains("data:{\"orderId\":" + orderId + "}"));

        reader.join(5000);
        stream.disconnect();
        HttpURLConnection list = open("GET", "/api/admin/orders?deliveryStatus=ALL", cookie);
        assertThat(list.getResponseCode()).isEqualTo(200);
        assertThat(new String(list.getInputStream().readAllBytes(), StandardCharsets.UTF_8))
                .contains("\"deliveryStatus\":\"EN_CAMINO\"");
    }

    private void waitFor(BooleanSupplier condition) throws Exception {
        long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
        while (!condition.getAsBoolean()) {
            if (System.nanoTime() > deadline) throw new AssertionError("Timed out waiting for the stream");
            TimeUnit.MILLISECONDS.sleep(50);
        }
    }
}
