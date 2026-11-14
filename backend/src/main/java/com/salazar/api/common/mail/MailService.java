package com.salazar.api.common.mail;

import com.salazar.api.auth.PasswordResetProperties;
import jakarta.mail.internet.MimeMessage;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class MailService {
    private static final String RESET_SUBJECT = "Restablece tu contraseña - Salazar";

    // Optional: without SMTP_HOST there is no JavaMailSender bean and the app must still boot
    private final ObjectProvider<JavaMailSender> mailSender;
    private final PasswordResetProperties resetProperties;
    private final String from;

    public MailService(
            ObjectProvider<JavaMailSender> mailSender,
            PasswordResetProperties resetProperties,
            @Value("${app.mail.from:}") String from) {
        this.mailSender = mailSender;
        this.resetProperties = resetProperties;
        this.from = from;
    }

    // Async so the response time doesn't reveal whether the account exists; failures are only logged
    @Async
    public void sendPasswordResetEmail(String to, String firstName, String link) {
        try {
            JavaMailSender sender = mailSender.getIfAvailable();
            if (sender == null) {
                throw new IllegalStateException("SMTP no configurado (SMTP_HOST vacío)");
            }
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            if (!from.isBlank()) {
                helper.setFrom(from);
            }
            helper.setTo(to);
            helper.setSubject(RESET_SUBJECT);
            helper.setText(buildPasswordResetBody(firstName, link), true);
            sender.send(message);
        } catch (Exception ex) {
            log.error("No se pudo enviar el correo de recuperación", ex);
        }
    }

    // Called from an already asynchronous listener, so it doesn't need @Async; failures are only logged
    public void sendOrderConfirmationEmail(OrderConfirmationMail mail) {
        try {
            JavaMailSender sender = mailSender.getIfAvailable();
            if (sender == null) {
                throw new IllegalStateException("SMTP no configurado (SMTP_HOST vacío)");
            }
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            if (!from.isBlank()) {
                helper.setFrom(from);
            }
            helper.setTo(mail.to());
            helper.setSubject("Confirmación de tu pedido " + mail.orderCode() + " - Salazar");
            helper.setText(buildOrderConfirmationBody(mail), true);
            sender.send(message);
        } catch (Exception ex) {
            log.error("No se pudo enviar el correo de confirmación del pedido {}", mail.orderCode(), ex);
        }
    }

    String buildOrderConfirmationBody(OrderConfirmationMail mail) {
        StringBuilder rows = new StringBuilder();
        for (OrderConfirmationMail.Line line : mail.items()) {
            rows.append("<tr><td>%s</td><td align=\"center\">%d</td><td align=\"right\">%s</td><td align=\"right\">%s</td></tr>\n"
                    .formatted(escape(line.name()), line.quantity(), escape(line.unitPrice()), escape(line.lineTotal())));
        }
        return """
                <p>Hola %s,</p>
                <p>Recibimos tu pedido en Salazar. Guarda este correo como constancia de tu compra.</p>
                <p>Código de pedido: <strong>%s</strong><br>
                Código de entrega: <strong>%s</strong><br>
                %s</p>
                <p>Nombre: %s<br>
                Estado del pago: %s<br>
                Estado de la entrega: %s<br>
                Cómo lo recibirás: %s<br>
                Cómo pagas: %s</p>
                <table cellpadding="4" cellspacing="0" border="0">
                <tr><th align="left">Plato</th><th>Cant.</th><th align="right">Precio</th><th align="right">Subtotal</th></tr>
                %s</table>
                <p>Subtotal: %s<br>
                Delivery: %s<br>
                <strong>Total: %s</strong></p>
                <p>Fecha de compra: %s<br>
                Fecha de pago: %s</p>
                """
                .formatted(
                        escape(mail.firstName()),
                        escape(mail.orderCode()),
                        escape(mail.deliveryCode()),
                        escape(mail.deliveryCodeHint()),
                        escape(mail.customerName()),
                        escape(mail.paymentStatus()),
                        escape(mail.deliveryStatus()),
                        escape(mail.receiving()),
                        escape(mail.paymentSummary()),
                        rows,
                        escape(mail.subtotal()),
                        escape(mail.delivery()),
                        escape(mail.total()),
                        escape(mail.purchasedAt()),
                        escape(mail.paidAt()));
    }

    String buildPasswordResetBody(String firstName, String link) {
        String safeLink = escape(link);
        int maxRequests = resetProperties.maxRequests();
        return """
                <p>Hola %s,</p>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Salazar.</p>
                <p><a href="%s">Crear una nueva contraseña</a></p>
                <p>Si el botón no funciona, copia y pega este enlace en tu navegador:<br>%s</p>
                <p>Antes de usarlo, ten en cuenta:</p>
                <ul>
                  <li>El enlace vale %s desde que se envió este correo.</li>
                  <li>Solo se puede usar una vez.</li>
                  <li>Solo el enlace más reciente es válido: si pides otro, este deja de funcionar.</li>
                  <li>Puedes pedir hasta %d enlaces por día; después deberás esperar a que pase ese tiempo.</li>
                </ul>
                <p>Si no pediste este cambio, ignora este correo: tu contraseña no cambiará.</p>
                """
                .formatted(escape(firstName), safeLink, safeLink, describe(resetProperties.tokenTtl()), maxRequests);
    }

    // Escapes only markup characters so accented names stay readable (HtmlUtils would emit &iacute;)
    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String describe(Duration duration) {
        long minutes = duration.toMinutes();
        return minutes == 1 ? "1 minuto" : minutes + " minutos";
    }
}
