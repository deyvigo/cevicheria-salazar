package com.salazar.api.auth;

import com.salazar.api.common.exception.TooManyAttemptsException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PasswordResetRequestLimiter {
    private static final String KEY_PREFIX = "password-reset:requests:";

    private final StringRedisTemplate redisTemplate;
    private final PasswordResetProperties properties;

    // Counts every request, existing account or not, so the 429 can't be used to enumerate accounts
    public void checkAndRecord(String email) {
        String key = KEY_PREFIX + email;
        Long requests = redisTemplate.opsForValue().increment(key);
        if (requests != null && requests == 1L) {
            redisTemplate.expire(key, properties.requestWindow());
        }
        if (requests != null && requests > properties.maxRequests()) {
            throw new TooManyAttemptsException("Demasiadas solicitudes de recuperación. Inténtalo de nuevo más tarde.");
        }
    }
}
