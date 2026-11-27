package com.salazar.api.pedidos;

import com.salazar.api.common.exception.TooManyAttemptsException;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/** Caps rejected coupon quotes per customer so codes cannot be guessed by trying them one after another. */
@Service
@RequiredArgsConstructor
public class CouponAttemptService {
    static final int MAX_FAILURES = 10;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final String KEY_PREFIX = "coupons:attempts:";

    private final StringRedisTemplate redisTemplate;

    public void checkNotBlocked(Long userId) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + userId);
        int failures = value == null ? 0 : Integer.parseInt(value);
        if (failures >= MAX_FAILURES) {
            throw new TooManyAttemptsException("Demasiados intentos con códigos de descuento. Espera unos minutos.");
        }
    }

    // A valid quote deliberately does not reset the count: alternating a good code would otherwise allow endless guesses
    public void recordFailure(Long userId) {
        String key = KEY_PREFIX + userId;
        Long failures = redisTemplate.opsForValue().increment(key);
        if (failures != null && failures == 1L) {
            redisTemplate.expire(key, WINDOW);
        }
    }
}
