package com.salazar.api.auth;

import com.salazar.api.common.exception.TooManyAttemptsException;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoginAttemptService {
    private static final int MAX_ATTEMPTS = 3;
    private static final Duration BLOCK_DURATION = Duration.ofMinutes(15);
    private static final String KEY_PREFIX = "login:attempts:";

    private final StringRedisTemplate redisTemplate;

    public void checkNotBlocked(String email) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + email);
        int attempts = value == null ? 0 : Integer.parseInt(value);
        if (attempts >= MAX_ATTEMPTS) {
            throw new TooManyAttemptsException("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
        }
    }

    public void recordFailure(String email) {
        // Keyed by email, not IP
        String key = KEY_PREFIX + email;
        Long attempts = redisTemplate.opsForValue().increment(key);
        if (attempts != null && attempts == 1L) {
            redisTemplate.expire(key, BLOCK_DURATION);
        }
    }

    public void recordSuccess(String email) {
        redisTemplate.delete(KEY_PREFIX + email);
    }
}
