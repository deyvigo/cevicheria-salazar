package com.salazar.api.catalogo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NamePatternTest {
    @Test
    void missingOrBlankTermMeansNoSearch() {
        assertThat(NamePattern.from(null)).isNull();
        assertThat(NamePattern.from("")).isNull();
        assertThat(NamePattern.from("   ")).isNull();
    }

    @Test
    void termIsTrimmedLowercasedAndStrippedOfAccents() {
        assertThat(NamePattern.from("  CEVICHÉ ")).isEqualTo("%ceviche%");
        assertThat(NamePattern.from("Piña")).isEqualTo("%pina%");
    }

    @Test
    void likeWildcardsAndEscapeCharacterAreLiteral() {
        assertThat(NamePattern.from("50%_!")).isEqualTo("%50!%!_!!%");
    }

    @Test
    void longTermIsCutToTheMaximumLength() {
        String pattern = NamePattern.from("a".repeat(150));

        assertThat(pattern).isEqualTo("%" + "a".repeat(NamePattern.MAX_LENGTH) + "%");
    }
}
