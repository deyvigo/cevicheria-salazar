package com.salazar.api.auth;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.common.exception.TooManyAttemptsException;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class PasswordResetRequestLimiterIT {
    @Autowired
    private PasswordResetRequestLimiter limiter;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Test
    void allowsThreeRequestsThenBlocksTheFourth() {
        String email = "limit-" + UUID.randomUUID() + "@correo.com";

        assertThatCode(() -> limiter.checkAndRecord(email)).doesNotThrowAnyException();
        assertThatCode(() -> limiter.checkAndRecord(email)).doesNotThrowAnyException();
        assertThatCode(() -> limiter.checkAndRecord(email)).doesNotThrowAnyException();

        assertThatThrownBy(() -> limiter.checkAndRecord(email)).isInstanceOf(TooManyAttemptsException.class);
    }

    @Test
    void theCounterExpiresAfterOneDay() {
        String email = "ttl-" + UUID.randomUUID() + "@correo.com";

        limiter.checkAndRecord(email);

        Long seconds = redisTemplate.getExpire("password-reset:requests:" + email);
        org.assertj.core.api.Assertions.assertThat(seconds)
                .isBetween(Duration.ofHours(23).toSeconds(), Duration.ofDays(1).toSeconds());
    }
}
