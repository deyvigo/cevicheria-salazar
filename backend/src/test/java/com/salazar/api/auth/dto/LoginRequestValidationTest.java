package com.salazar.api.auth.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class LoginRequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aRequestWithValidDataHasNoViolations() {
        assertThat(validator.validate(new LoginRequest("maria@correo.com", "cualquier-cosa"))).isEmpty();
    }

    @Test
    void trimsAndLowercasesTheEmailBeforeValidating() {
        var request = new LoginRequest("  Maria@Correo.com  ", "clave1234");

        assertThat(request.email()).isEqualTo("maria@correo.com");
    }

    @Test
    void doesNotEnforceThePasswordComplexityRuleOfRegister() {
        assertThat(validator.validate(new LoginRequest("maria@correo.com", "abc"))).isEmpty();
    }

    @Test
    void toStringNeverLeaksThePassword() {
        assertThat(new LoginRequest("maria@correo.com", "clave1234").toString())
                .doesNotContain("clave1234")
                .contains("password=***");
    }

    @ParameterizedTest
    @CsvSource({
        "'', clave1234",
        "no-es-un-correo, clave1234",
        "maria@correo.com, ''",
    })
    void rejectsInvalidCombinations(String email, String password) {
        assertThat(validator.validate(new LoginRequest(email, password))).isNotEmpty();
    }
}
