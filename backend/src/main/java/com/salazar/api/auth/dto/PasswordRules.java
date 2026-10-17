package com.salazar.api.auth.dto;

public final class PasswordRules {
    public static final String REGEXP = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$";
    public static final String MESSAGE = "La contraseña debe tener al menos 8 caracteres, con letras y números.";
    public static final int MAX_LENGTH = 72;
    public static final String MAX_LENGTH_MESSAGE = "La contraseña no puede superar los 72 caracteres.";

    private PasswordRules() {}
}
