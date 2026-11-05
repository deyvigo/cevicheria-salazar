package com.salazar.api.pedidos;

import com.salazar.api.common.exception.PaymentGatewayException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public on purpose: Mercado Pago calls it without a session, so the signature is the only way in. */
@Slf4j
@RestController
@RequestMapping("/api/pagos/mercadopago")
@RequiredArgsConstructor
public class MercadoPagoWebhookController {
    private final MercadoPagoSignatureVerifier signatureVerifier;
    private final PaymentWebhookService webhookService;

    @PostMapping("/webhook")
    public ResponseEntity<Void> receive(
            @RequestHeader(name = "x-signature", required = false) String signature,
            @RequestHeader(name = "x-request-id", required = false) String requestId,
            @RequestParam(name = "data.id", required = false) String queryDataId,
            @RequestParam(name = "type", required = false) String type,
            @RequestBody(required = false) Map<String, Object> body) {
        String dataId = queryDataId != null ? queryDataId : bodyDataId(body);
        if (!signatureVerifier.isValid(signature, requestId, queryDataId != null ? queryDataId : dataId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String eventType = type != null ? type : body == null ? null : String.valueOf(body.get("type"));
        if (!"payment".equals(eventType) || dataId == null) {
            return ResponseEntity.ok().build();
        }
        try {
            webhookService.handlePayment(dataId);
        } catch (PaymentGatewayException e) {
            // A 5xx makes Mercado Pago retry later, which is what we want when it could not be reached
            log.error("Could not process payment notification {}", dataId, e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
        return ResponseEntity.ok().build();
    }

    private String bodyDataId(Map<String, Object> body) {
        if (body != null && body.get("data") instanceof Map<?, ?> data && data.get("id") != null) {
            return String.valueOf(data.get("id"));
        }
        return null;
    }
}
