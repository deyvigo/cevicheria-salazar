package com.salazar.api.auth;

import com.salazar.api.auth.dto.UserResponse;

public record AuthResult(UserResponse user, String accessToken, String refreshToken) {}
