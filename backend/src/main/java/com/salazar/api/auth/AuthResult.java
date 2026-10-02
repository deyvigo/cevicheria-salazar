package com.salazar.api.auth;

import com.salazar.api.auth.dto.UserResponse;

/** Resultado interno de {@link AuthService}; el controlador lo traduce a cuerpo + cookies. */
public record AuthResult(UserResponse user, String accessToken, String refreshToken) {}
