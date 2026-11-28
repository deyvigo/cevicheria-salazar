package com.salazar.api.admin.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.salazar.api.pedidos.DiscountType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class CouponRequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private static CouponRequest request(String code, String value, Integer maxUses, Integer perCustomer) {
        return new CouponRequest(
                code, DiscountType.FIXED, new BigDecimal(value), null, maxUses, perCustomer, null, null, true);
    }

    private Set<String> invalidFields(CouponRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    @Test
    void stripsAndUppercasesTheCode() {
        assertThat(request("  ceviche10 ", "5.00", null, null).code()).isEqualTo("CEVICHE10");
    }

    @Test
    void optionalLimitsAndDatesMayBeEmpty() {
        assertThat(validator.validate(request("CEVICHE10", "5.00", null, null))).isEmpty();
    }

    @Test
    void aOneDayCouponIsValid() {
        LocalDate day = LocalDate.of(2026, 12, 24);
        var request =
                new CouponRequest("NAVIDAD", DiscountType.PERCENTAGE, new BigDecimal("15"), null, null, null, day, day, true);

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void rejectsEachInvalidFieldUnderItsName() {
        assertThat(invalidFields(request("", "5.00", null, null))).contains("code");
        assertThat(invalidFields(request("CON ESPACIO", "5.00", null, null))).containsExactly("code");
        assertThat(invalidFields(request("A".repeat(31), "5.00", null, null))).containsExactly("code");
        assertThat(invalidFields(request("CEVICHE10", "0", null, null))).containsExactly("discountValue");
        assertThat(invalidFields(request("CEVICHE10", "5.001", null, null))).containsExactly("discountValue");
        assertThat(invalidFields(request("CEVICHE10", "5.00", 0, null))).containsExactly("maxUses");
        assertThat(invalidFields(request("CEVICHE10", "5.00", null, -1))).containsExactly("maxUsesPerCustomer");
    }
}
