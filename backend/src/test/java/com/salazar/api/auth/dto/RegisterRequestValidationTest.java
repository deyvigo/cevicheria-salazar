package com.salazar.api.auth.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class RegisterRequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private RegisterRequest validRequest() {
        return new RegisterRequest("maria@correo.com", "clave1234", "María", "Quispe", "987654321");
    }

    @Test
    void aRequestWithValidDataHasNoViolations() {
        assertThat(validator.validate(validRequest())).isEmpty();
    }

    @Test
    void trimsAndLowercasesBeforeValidating() {
        var request = new RegisterRequest("  Maria@Correo.com  ", "clave1234", "  María  ", "  Quispe  ", "  987654321  ");

        assertThat(request.email()).isEqualTo("maria@correo.com");
        assertThat(request.firstName()).isEqualTo("María");
        assertThat(request.lastName()).isEqualTo("Quispe");
        assertThat(request.phone()).isEqualTo("987654321");
    }

    @Test
    void toStringNeverLeaksThePassword() {
        assertThat(validRequest().toString()).doesNotContain("clave1234").contains("password=***");
    }

    @ParameterizedTest
    @CsvSource({
        "'', clave1234, María, Quispe, 987654321",
        "no-es-un-correo, clave1234, María, Quispe, 987654321",
        "maria@correo.com, '', María, Quispe, 987654321",
        "maria@correo.com, corta1, María, Quispe, 987654321",
        "maria@correo.com, sololetras, María, Quispe, 987654321",
        "maria@correo.com, 12345678, María, Quispe, 987654321",
        "maria@correo.com, clave1234, '', Quispe, 987654321",
        "maria@correo.com, clave1234, María, '', 987654321",
        "maria@correo.com, clave1234, María, Quispe, ''",
        "maria@correo.com, clave1234, María, Quispe, 12345678",
        "maria@correo.com, clave1234, María, Quispe, 887654321",
    })
    void rejectsInvalidCombinations(String email, String password, String firstName, String lastName, String phone) {
        var request = new RegisterRequest(email, password, firstName, lastName, phone);

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        assertThat(violations).isNotEmpty();
    }
}
