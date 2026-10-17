package com.salazar.api.perfil;

import com.salazar.api.auth.RefreshTokenRepository;
import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.auth.dto.UserResponse;
import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.common.security.TokenHasher;
import com.salazar.api.perfil.dto.ChangePasswordRequest;
import com.salazar.api.perfil.dto.UpdateProfileRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordChangeAttemptService attemptService;
    private final TokenHasher tokenHasher;

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = loadCustomer(userId);
        user.updateProfile(request.firstName(), request.lastName(), request.phone());
        return UserResponse.from(user);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request, String currentRefreshToken) {
        User user = loadCustomer(userId);

        if (user.getPasswordHash() != null) {
            attemptService.checkNotBlocked(userId);
            String current = request.currentPassword();
            if (current == null || current.isBlank()) {
                throw new FieldInvalidException("currentPassword", "La contraseña actual es obligatoria.");
            }
            if (!passwordEncoder.matches(current, user.getPasswordHash())) {
                attemptService.recordFailure(userId);
                throw new FieldInvalidException("currentPassword", "La contraseña actual no es correcta.");
            }
            if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
                throw new FieldInvalidException("newPassword", "La nueva contraseña debe ser distinta de la actual.");
            }
        }

        user.changePassword(passwordEncoder.encode(request.newPassword()));
        attemptService.recordSuccess(userId);

        if (currentRefreshToken == null) {
            refreshTokenRepository.revokeAllByUserId(userId);
        } else {
            refreshTokenRepository.revokeAllByUserIdExcept(userId, tokenHasher.hash(currentRefreshToken));
        }
    }

    private User loadCustomer(Long userId) {
        User user = userRepository
                .findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new InsufficientAuthenticationException("Usuario no encontrado."));
        if (user.getRole() != UserRole.CLIENTE) {
            throw new AccessDeniedException("Solo los clientes tienen perfil.");
        }
        return user;
    }
}
