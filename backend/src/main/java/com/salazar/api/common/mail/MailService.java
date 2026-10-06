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
