package com.salazar.api.auth.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Valida el DTO directamente (sin levantar Spring) — cubre HU-01: campos vacíos, formatos inválidos. */
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
        "'', clave1234, María, Quispe, 987654321", // correo vacío
        "no-es-un-correo, clave1234, María, Quispe, 987654321", // correo inválido
        "maria@correo.com, '', María, Quispe, 987654321", // contraseña vacía
        "maria@correo.com, corta1, María, Quispe, 987654321", // contraseña corta
        "maria@correo.com, sololetras, María, Quispe, 987654321", // contraseña sin número
        "maria@correo.com, 12345678, María, Quispe, 987654321", // contraseña sin letra
        "maria@correo.com, clave1234, '', Quispe, 987654321", // nombre vacío
        "maria@correo.com, clave1234, María, '', 987654321", // apellido vacío
        "maria@correo.com, clave1234, María, Quispe, ''", // teléfono vacío
        "maria@correo.com, clave1234, María, Quispe, 12345678", // teléfono de 8 dígitos
        "maria@correo.com, clave1234, María, Quispe, 887654321", // teléfono no empieza con 9
    })
    void rejectsInvalidCombinations(String email, String password, String firstName, String lastName, String phone) {
        var request = new RegisterRequest(email, password, firstName, lastName, phone);

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        assertThat(violations).isNotEmpty();
    }
}
