package com.salazar.api;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.test.context.TestPropertySource;

/**
 * Agrupa los valores de prueba que cualquier {@code @SpringBootTest} necesita para
 * que el contexto arranque: ni el secreto JWT ni las credenciales de Google tienen
 * un default real a propósito (ver application.yml), así que hace falta uno de
 * prueba en cada test que cargue el contexto completo.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@TestPropertySource(
        properties = {
            "app.jwt.secret=test-only-secret-not-for-production-use-32byte",
            "spring.security.oauth2.client.registration.google.client-id=test-client-id",
            "spring.security.oauth2.client.registration.google.client-secret=test-client-secret"
        })
public @interface WithTestSecrets {}
