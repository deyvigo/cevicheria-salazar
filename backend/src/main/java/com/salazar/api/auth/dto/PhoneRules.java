package com.salazar.api.auth.dto;

public final class PhoneRules {
    public static final String REGEXP = "^9[0-9]{8}$";
    public static final String MESSAGE = "Ingresa un teléfono de 9 dígitos que empiece con 9.";

    private PhoneRules() {}
}
