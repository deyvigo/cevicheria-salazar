package com.salazar.api.auth.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ForgotPasswordRequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aValidEmailHasNoViolations() {
        assertThat(validator.validate(new ForgotPasswordRequest("maria@correo.com"))).isEmpty();
    }

    @Test
    void trimsAndLowercasesTheEmail() {
        assertThat(new ForgotPasswordRequest("  Maria@Correo.com ").email()).isEqualTo("maria@correo.com");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "no-es-un-correo"})
    void rejectsBlankOrMalformedEmails(String email) {
        assertThat(validator.validate(new ForgotPasswordRequest(email))).isNotEmpty();
    }
}
