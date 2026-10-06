package com.salazar.api.auth.dto;

import com.salazar.api.auth.User;

public record UserResponse(
        Long id, String email, String firstName, String lastName, String phone, String role, boolean emailVerified) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getRole().name(),
                user.isEmailVerified());
    }
}
