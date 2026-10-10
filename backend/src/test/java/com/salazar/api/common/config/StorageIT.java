package com.salazar.api.common.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

class StorageIT {
    private static final String ACCESS_KEY = "GK0123456789abcdef01234567";
    private static final String SECRET_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String BUCKET = "platos";

    private static GenericContainer<?> garage;
    private static S3Client s3;
    private static HttpClient http;

    @BeforeAll
    static void startGarage() throws Exception {
        // HttpClient forbids overriding Host by default; the web endpoint picks the bucket from it
        System.setProperty("jdk.httpclient.allowRestrictedHeaders", "host");

        garage = new GenericContainer<>(DockerImageName.parse("dxflrs/garage:v1.0.1"))
                .withCopyFileToContainer(MountableFile.forClasspathResource("garage-test.toml"), "/etc/garage.toml")
                .withExposedPorts(3900, 3902)
                .waitingFor(Wait.forLogMessage(".*Web server listening.*", 1));
        garage.start();

        String nodeId = exec("/garage", "node", "id", "-q").split("@")[0].trim();
        exec("/garage", "layout", "assign", "-z", "dc1", "-c", "1G", nodeId);
        exec("/garage", "layout", "apply", "--version", "1");
        exec("/garage", "key", "import", "--yes", "-n", "test", ACCESS_KEY, SECRET_KEY);
        exec("/garage", "bucket", "create", BUCKET);
        exec("/garage", "bucket", "allow", "--read", "--write", "--owner", BUCKET, "--key", ACCESS_KEY);
        exec("/garage", "bucket", "website", "--allow", BUCKET);
        // Production serves media.cevicheria-salazar.com, so the bucket answers to the full domain as well
        exec("/garage", "bucket", "alias", BUCKET, "media.test");

        s3 = StorageConfig.s3ClientBuilder(new StorageProperties(
                        "http://" + garage.getHost() + ":" + garage.getMappedPort(3900),
                        "garage",
                        ACCESS_KEY,
                        SECRET_KEY,
                        BUCKET,
                        "unused"))
                .build();
        http = HttpClient.newHttpClient();
    }

    @AfterAll
    static void stopGarage() {
        if (s3 != null) s3.close();
        if (garage != null) garage.stop();
    }

    private static String exec(String... command) throws Exception {
        var result = garage.execInContainer(command);
        assertThat(result.getExitCode()).describedAs(String.join(" ", command) + ": " + result.getStderr()).isZero();
        return result.getStdout();
    }

    private HttpResponse<String> publicGet(String host, String path) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create("http://" + garage.getHost() + ":" + garage.getMappedPort(3902) + path))
                .header("Host", host)
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void uploadsReadsStatsAndDeletesAnObject() {
        String key = "seed/roundtrip.svg";
        s3.putObject(
                PutObjectRequest.builder().bucket(BUCKET).key(key).contentType("image/svg+xml").build(),
                RequestBody.fromString("<svg xmlns='http://www.w3.org/2000/svg'/>"));

        var head = s3.headObject(HeadObjectRequest.builder().bucket(BUCKET).key(key).build());
        assertThat(head.contentType()).isEqualTo("image/svg+xml");
        String body = s3.getObjectAsBytes(
                        GetObjectRequest.builder().bucket(BUCKET).key(key).build())
                .asUtf8String();
        assertThat(body).contains("<svg");

        s3.deleteObject(DeleteObjectRequest.builder().bucket(BUCKET).key(key).build());
        assertThatThrownBy(() -> s3.headObject(
                        HeadObjectRequest.builder().bucket(BUCKET).key(key).build()))
                .isInstanceOf(NoSuchKeyException.class);
    }

    @Test
    void publishedObjectIsReadableWithoutCredentialsThroughTheWebEndpoint() throws Exception {
        s3.putObject(
                PutObjectRequest.builder().bucket(BUCKET).key("seed/public.svg").contentType("image/svg+xml").build(),
                RequestBody.fromString("<svg xmlns='http://www.w3.org/2000/svg'/>"));

        var byBucketHost = publicGet("platos.web.garage.localhost", "/seed/public.svg");
        var byDomain = publicGet("media.test", "/seed/public.svg");
        var missing = publicGet("platos.web.garage.localhost", "/seed/nope.svg");

        assertThat(byBucketHost.statusCode()).isEqualTo(200);
        assertThat(byBucketHost.headers().firstValue("content-type")).contains("image/svg+xml");
        assertThat(byDomain.statusCode()).isEqualTo(200);
        assertThat(missing.statusCode()).isEqualTo(404);
    }
}
