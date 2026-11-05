package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class MercadoPagoSignatureVerifierTest {
    private static final String SECRET = "test-webhook-secret";

    private final MercadoPagoSignatureVerifier verifier =
            new MercadoPagoSignatureVerifier(new MercadoPagoProperties("token", SECRET, "https://api.example.com"));

    static String sign(String secret, String manifest) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void acceptsASignatureBuiltFromTheManifest() throws Exception {
        String v1 = sign(SECRET, "id:12345;request-id:req-1;ts:1700000000;");

        assertThat(verifier.isValid("ts=1700000000,v1=" + v1, "req-1", "12345")).isTrue();
    }

    @Test
    void lowercasesTheDataIdLikeMercadoPagoDoes() throws Exception {
        String v1 = sign(SECRET, "id:abc123;request-id:req-1;ts:1700000000;");

        assertThat(verifier.isValid("ts=1700000000,v1=" + v1, "req-1", "ABC123")).isTrue();
    }

    @Test
    void leavesOutThePartsThatDidNotArrive() throws Exception {
        String v1 = sign(SECRET, "id:12345;ts:1700000000;");

        assertThat(verifier.isValid("ts=1700000000,v1=" + v1, null, "12345")).isTrue();
    }

    @Test
    void rejectsASignatureMadeWithAnotherSecret() throws Exception {
        String v1 = sign("another-secret", "id:12345;request-id:req-1;ts:1700000000;");

        assertThat(verifier.isValid("ts=1700000000,v1=" + v1, "req-1", "12345")).isFalse();
    }

    @Test
    void rejectsAnAlteredPaymentIdOrTimestamp() throws Exception {
        String v1 = sign(SECRET, "id:12345;request-id:req-1;ts:1700000000;");

        assertThat(verifier.isValid("ts=1700000000,v1=" + v1, "req-1", "99999")).isFalse();
        assertThat(verifier.isValid("ts=1700000001,v1=" + v1, "req-1", "12345")).isFalse();
    }

    @Test
    void rejectsMissingOrMalformedHeaders() {
        assertThat(verifier.isValid(null, "req-1", "12345")).isFalse();
        assertThat(verifier.isValid("", "req-1", "12345")).isFalse();
        assertThat(verifier.isValid("garbage", "req-1", "12345")).isFalse();
        assertThat(verifier.isValid("ts=1700000000", "req-1", "12345")).isFalse();
        assertThat(verifier.isValid("v1=abc", "req-1", "12345")).isFalse();
    }

    @Test
    void rejectsEverythingWhenNoSecretIsConfigured() throws Exception {
        MercadoPagoSignatureVerifier unconfigured =
                new MercadoPagoSignatureVerifier(new MercadoPagoProperties("token", "", null));
        String v1 = sign(SECRET, "id:12345;ts:1700000000;");

        assertThat(unconfigured.isValid("ts=1700000000,v1=" + v1, null, "12345")).isFalse();
    }
}
