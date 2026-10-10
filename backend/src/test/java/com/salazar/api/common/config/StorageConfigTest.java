package com.salazar.api.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.core.interceptor.Context;
import software.amazon.awssdk.core.interceptor.ExecutionAttributes;
import software.amazon.awssdk.core.interceptor.ExecutionInterceptor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.SdkHttpRequest;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

class StorageConfigTest {
    private final StorageProperties properties = new StorageProperties(
            "http://localhost:1", "garage", "GKtestaccesskey", "secret", "platos", "http://media.test");

    // Guards the Garage-specific client settings so an SDK upgrade can't silently break uploads
    @Test
    void putObjectUsesPathStyleAndSendsNoChecksumHeaders() {
        AtomicReference<SdkHttpRequest> captured = new AtomicReference<>();
        ExecutionInterceptor capture = new ExecutionInterceptor() {
            @Override
            public void beforeTransmission(Context.BeforeTransmission context, ExecutionAttributes attributes) {
                captured.set(context.httpRequest());
                throw new IllegalStateException("stop before hitting the network");
            }
        };

        try (S3Client client = StorageConfig.s3ClientBuilder(properties)
                .overrideConfiguration(ClientOverrideConfiguration.builder()
                        .addExecutionInterceptor(capture)
                        .build())
                .build()) {
            try {
                client.putObject(
                        PutObjectRequest.builder().bucket("platos").key("seed/a.svg").build(),
                        RequestBody.fromString("x"));
            } catch (RuntimeException expected) {
                // the interceptor aborts the call on purpose
            }
        }

        SdkHttpRequest request = captured.get();
        assertThat(request).isNotNull();
        assertThat(request.host()).isEqualTo("localhost");
        assertThat(request.encodedPath()).isEqualTo("/platos/seed/a.svg");
        assertThat(request.headers().keySet())
                .noneMatch(name -> name.toLowerCase().startsWith("x-amz-checksum")
                        || name.equalsIgnoreCase("x-amz-sdk-checksum-algorithm"));
    }
}
