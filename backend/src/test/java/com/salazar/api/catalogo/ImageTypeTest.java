package com.salazar.api.catalogo;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ImageTypeTest {
    @Test
    void detectsTheFormatFromTheSignature() {
        assertThat(ImageType.detect(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0}))
                .contains(ImageType.JPEG);
        assertThat(ImageType.detect(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0}))
                .contains(ImageType.PNG);
        assertThat(ImageType.detect("RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1)))
                .contains(ImageType.WEBP);
    }

    @Test
    void rejectsAnythingElseWhateverItsName() {
        assertThat(ImageType.detect("<html></html>".getBytes(StandardCharsets.UTF_8))).isEmpty();
        assertThat(ImageType.detect("GIF89a".getBytes(StandardCharsets.UTF_8))).isEmpty();
        assertThat(ImageType.detect("RIFF\0\0\0\0WAVEfmt ".getBytes(StandardCharsets.ISO_8859_1))).isEmpty();
        assertThat(ImageType.detect(new byte[0])).isEmpty();
    }
}
