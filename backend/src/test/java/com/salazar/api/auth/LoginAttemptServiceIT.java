package com.salazar.api.auth;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.common.exception.TooManyAttemptsException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

/** Contra el Redis real de Testcontainers — el comportamiento de INCR/EXPIRE no se presta a mocks. */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "app.jwt.secret=test-only-secret-not-for-production-use-32byte")
class LoginAttemptServiceIT {

    @Autowired
    private LoginAttemptService loginAttemptService;

    private String uniqueEmail() {
        return "login-attempts-" + UUID.randomUUID() + "@correo.com";
    }

    @Test
    void allowsUpToThreeFailuresThenBlocksTheFourthAttempt() {
        String email = uniqueEmail();

        assertThatCode(() -> loginAttemptService.checkNotBlocked(email)).doesNotThrowAnyException();
        loginAttemptService.recordFailure(email);

        assertThatCode(() -> loginAttemptService.checkNotBlocked(email)).doesNotThrowAnyException();
        loginAttemptService.recordFailure(email);

        assertThatCode(() -> loginAttemptService.checkNotBlocked(email)).doesNotThrowAnyException();
        loginAttemptService.recordFailure(email);

        assertThatThrownBy(() -> loginAttemptService.checkNotBlocked(email))
                .isInstanceOf(TooManyAttemptsException.class);
    }

    @Test
    void aSuccessfulLoginResetsThePreviousFailures() {
        String email = uniqueEmail();

        loginAttemptService.recordFailure(email);
        loginAttemptService.recordFailure(email);
        loginAttemptService.recordSuccess(email);

        assertThatCode(() -> loginAttemptService.checkNotBlocked(email)).doesNotThrowAnyException();
    }
}
