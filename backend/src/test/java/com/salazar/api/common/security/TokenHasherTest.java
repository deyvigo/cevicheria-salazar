package com.salazar.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TokenHasherTest {
    private final TokenHasher hasher = new TokenHasher();

    @Test
    void producesTheKnownSha256HexDigest() {
        assertThat(hasher.hash("abc")).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    @Test
    void isDeterministicAndDiffersPerInput() {
        assertThat(hasher.hash("a")).isEqualTo(hasher.hash("a")).isNotEqualTo(hasher.hash("b"));
    }
}
