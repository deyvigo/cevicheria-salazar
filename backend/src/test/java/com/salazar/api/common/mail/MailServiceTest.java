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
}
