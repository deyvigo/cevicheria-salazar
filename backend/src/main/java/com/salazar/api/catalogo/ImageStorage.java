package com.salazar.api.catalogo;

import com.salazar.api.common.config.StorageProperties;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Component
@RequiredArgsConstructor
@Slf4j
public class ImageStorage {
    private final S3Client s3Client;
    private final StorageProperties properties;

    /** Stores the image under a generated key and returns that key (the value kept in product_images.path). */
    public String upload(byte[] data, ImageType type) {
        String key = "products/" + UUID.randomUUID() + "." + type.extension();
        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(properties.bucket())
                        .key(key)
                        .contentType(type.contentType())
                        .build(),
                RequestBody.fromBytes(data));
        return key;
    }

    /** Best effort: an orphaned object is invisible to everyone, so a failure must not undo a saved dish. */
    public void deleteQuietly(String key) {
        try {
            s3Client.deleteObject(
                    DeleteObjectRequest.builder().bucket(properties.bucket()).key(key).build());
        } catch (RuntimeException ex) {
            log.warn("Could not delete image {}", key, ex);
        }
    }
}
