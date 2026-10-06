package com.salazar.api.auth.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ResetPasswordRequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aValidRequestHasNoViolations() {
        assertThat(validator.validate(new ResetPasswordRequest("token", "clave1234"))).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
        "token, corta1",
        "token, sololetrasaqui",
        "token, 123456789",
        "token, ''",
        "'', clave1234",
    })
    void rejectsInvalidCombinations(String token, String password) {
        assertThat(validator.validate(new ResetPasswordRequest(token, password))).isNotEmpty();
    }

    @Test
    void toStringNeverLeaksTokenOrPassword() {
        assertThat(new ResetPasswordRequest("secreto-token", "clave1234").toString())
                .doesNotContain("secreto-token")
                .doesNotContain("clave1234");
    }
}
