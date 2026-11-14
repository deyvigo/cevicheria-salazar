package com.salazar.api.common.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.PasswordResetProperties;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.Duration;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class MailServiceTest {
    private final PasswordResetProperties properties =
            new PasswordResetProperties(Duration.ofMinutes(30), 3, Duration.ofDays(1));

    @SuppressWarnings("unchecked")
    private final ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);

    private MailService service() {
        return new MailService(provider, properties, "no-reply@salazar.pe");
    }

    @Test
    void bodyContainsTheLinkAndEveryRule() {
        String body = service().buildPasswordResetBody("María", "http://localhost:5173/restablecer-contrasena?token=abc");

        assertThat(body)
                .contains("Hola María")
                .contains("http://localhost:5173/restablecer-contrasena?token=abc")
                .contains("30 minutos")
                .contains("Solo se puede usar una vez")
                .contains("Solo el enlace más reciente es válido")
                .contains("hasta 3 enlaces por día")
                .contains("ignora este correo");
    }

    @Test
    void bodyEscapesHtmlInTheName() {
        String body = service().buildPasswordResetBody("<script>", "http://x/?token=a");

        assertThat(body).doesNotContain("<script>").contains("&lt;script&gt;");
    }

    @Test
    void sendsTheMessageThroughTheMailSender() {
        JavaMailSender sender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        when(provider.getIfAvailable()).thenReturn(sender);

        service().sendPasswordResetEmail("maria@correo.com", "María", "http://x/?token=a");

        verify(sender).send(message);
    }

    @Test
    void sendFailuresAreSwallowed() {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        org.mockito.Mockito.doThrow(new MailSendException("smtp caído")).when(sender).send(any(MimeMessage.class));
        when(provider.getIfAvailable()).thenReturn(sender);

        assertThatCode(() -> service().sendPasswordResetEmail("maria@correo.com", "María", "http://x/?token=a"))
                .doesNotThrowAnyException();
    }

    @Test
    void missingSmtpConfigurationDoesNotThrow() {
        when(provider.getIfAvailable()).thenReturn(null);

        assertThatCode(() -> service().sendPasswordResetEmail("maria@correo.com", "María", "http://x/?token=a"))
                .doesNotThrowAnyException();
    }

    private OrderConfirmationMail confirmation(String name, String reference) {
        return new OrderConfirmationMail(
                "maria@correo.com",
                "María",
                "SAL-001042",
                "4827",
                "Díselo al repartidor al recibir tu pedido.",
                name,
                "Pagado",
                "En preparación",
                "Entrega a domicilio - Casa: Av. Arequipa 123 (" + reference + ")",
                "Pago en línea",
                java.util.List.of(new OrderConfirmationMail.Line("Ceviche clásico", 2, "S/ 30.00", "S/ 60.00")),
                "S/ 60.00",
                "S/ 8.50",
                "S/ 68.50",
                "7 nov 2026, 14:30",
                "7 nov 2026, 14:35");
    }

    @Test
    void confirmationBodyShowsEveryDetailOfTheOrder() {
        String body = service().buildOrderConfirmationBody(confirmation("María Quispe", "Puerta verde"));

        assertThat(body)
                .contains("Hola María")
                .contains("SAL-001042")
                .contains("4827")
                .contains("Díselo al repartidor al recibir tu pedido.")
                .contains("María Quispe")
                .contains("Pagado")
                .contains("En preparación")
                .contains("Av. Arequipa 123")
                .contains("Pago en línea")
                .contains("Ceviche clásico")
                .contains("S/ 60.00")
                .contains("S/ 8.50")
                .contains("S/ 68.50")
                .contains("7 nov 2026, 14:30")
                .contains("7 nov 2026, 14:35");
    }

    @Test
    void confirmationBodyEscapesCustomerText() {
        String body = service().buildOrderConfirmationBody(confirmation("<b>Ana</b>", "<script>alert(1)</script>"));

        assertThat(body).doesNotContain("<script>").doesNotContain("<b>Ana").contains("&lt;script&gt;");
    }

    @Test
    void sendsTheConfirmationWithTheOrderCodeInTheSubject() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        when(provider.getIfAvailable()).thenReturn(sender);

        service().sendOrderConfirmationEmail(confirmation("María Quispe", "Puerta verde"));

        verify(sender).send(message);
        assertThat(message.getSubject()).isEqualTo("Confirmación de tu pedido SAL-001042 - Salazar");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("maria@correo.com");
    }

    @Test
    void confirmationFailuresAndMissingSmtpDoNotThrow() {
        when(provider.getIfAvailable()).thenReturn(null);
        assertThatCode(() -> service().sendOrderConfirmationEmail(confirmation("María Quispe", "x")))
                .doesNotThrowAnyException();

        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        org.mockito.Mockito.doThrow(new MailSendException("smtp caído")).when(sender).send(any(MimeMessage.class));
        when(provider.getIfAvailable()).thenReturn(sender);
        assertThatCode(() -> service().sendOrderConfirmationEmail(confirmation("María Quispe", "x")))
                .doesNotThrowAnyException();
    }
}
