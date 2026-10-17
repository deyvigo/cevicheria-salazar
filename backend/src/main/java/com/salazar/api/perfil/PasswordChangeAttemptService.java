package com.salazar.api.perfil;

import com.salazar.api.common.exception.TooManyAttemptsException;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PasswordChangeAttemptService {
    private static final int MAX_ATTEMPTS = 3;
    private static final Duration BLOCK_DURATION = Duration.ofMinutes(15);
    private static final String KEY_PREFIX = "profile:password-attempts:";

    private final StringRedisTemplate redisTemplate;

    public void checkNotBlocked(Long userId) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + userId);
        int attempts = value == null ? 0 : Integer.parseInt(value);
        if (attempts >= MAX_ATTEMPTS) {
            throw new TooManyAttemptsException("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
        }
    }

    public void recordFailure(Long userId) {
        String key = KEY_PREFIX + userId;
        Long attempts = redisTemplate.opsForValue().increment(key);
        if (attempts != null && attempts == 1L) {
            redisTemplate.expire(key, BLOCK_DURATION);
        }
    }

    public void recordSuccess(Long userId) {
        redisTemplate.delete(KEY_PREFIX + userId);
    }
}
