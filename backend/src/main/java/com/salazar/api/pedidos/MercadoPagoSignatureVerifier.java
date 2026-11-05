package com.salazar.api.pedidos;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Checks the x-signature header Mercado Pago adds to every notification (HMAC-SHA256 over a fixed manifest). */
@Component
@RequiredArgsConstructor
public class MercadoPagoSignatureVerifier {
    private final MercadoPagoProperties properties;

    public boolean isValid(String signatureHeader, String requestId, String dataId) {
        if (!properties.hasWebhookSecret() || signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }
        String timestamp = null;
        String signature = null;
        for (String part : signatureHeader.split(",")) {
            String[] pair = part.trim().split("=", 2);
            if (pair.length != 2) {
                continue;
            }
            if (pair[0].equals("ts")) {
                timestamp = pair[1];
            } else if (pair[0].equals("v1")) {
                signature = pair[1];
            }
        }
        if (timestamp == null || signature == null) {
            return false;
        }

        // Parts that did not arrive are left out of the manifest, as Mercado Pago does when signing
        StringBuilder manifest = new StringBuilder();
        if (dataId != null && !dataId.isBlank()) {
            manifest.append("id:").append(dataId.toLowerCase()).append(';');
        }
        if (requestId != null && !requestId.isBlank()) {
            manifest.append("request-id:").append(requestId).append(';');
        }
        manifest.append("ts:").append(timestamp).append(';');

        String expected = hmac(manifest.toString());
        // Constant-time comparison so the signature cannot be guessed byte by byte
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), signature.toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(properties.webhookSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HmacSHA256 is not available", e);
        }
    }
}
