package com.salazar.api.perfil;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.auth.LoginAttemptService;
import com.salazar.api.common.exception.TooManyAttemptsException;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class PasswordChangeAttemptServiceIT {
    @Autowired
    private PasswordChangeAttemptService service;

    @Autowired
    private LoginAttemptService loginAttemptService;

    private long uniqueId() {
        return ThreadLocalRandom.current().nextLong(1_000_000, Long.MAX_VALUE);
    }

    @Test
    void blocksTheFourthAttempt() {
        long id = uniqueId();
        for (int i = 0; i < 3; i++) {
            assertThatCode(() -> service.checkNotBlocked(id)).doesNotThrowAnyException();
            service.recordFailure(id);
        }

        assertThatThrownBy(() -> service.checkNotBlocked(id)).isInstanceOf(TooManyAttemptsException.class);
    }

    @Test
    void aSuccessResetsTheFailures() {
        long id = uniqueId();
        service.recordFailure(id);
        service.recordFailure(id);
        service.recordSuccess(id);
        service.recordFailure(id);

        assertThatCode(() -> service.checkNotBlocked(id)).doesNotThrowAnyException();
    }

    @Test
    void doesNotShareTheLoginCounter() {
        long id = uniqueId();
        for (int i = 0; i < 3; i++) {
            service.recordFailure(id);
        }

        assertThatCode(() -> loginAttemptService.checkNotBlocked(String.valueOf(id))).doesNotThrowAnyException();
    }
}
