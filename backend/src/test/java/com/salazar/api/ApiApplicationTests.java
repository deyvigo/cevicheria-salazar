package com.salazar.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

@Import(TestcontainersConfiguration.class)
// app.jwt.secret no tiene default real (application.yml lo deja vacío a propósito);
// sin esto, JwtService no puede construirse y ningún @SpringBootTest carga el contexto.
@TestPropertySource(properties = "app.jwt.secret=test-only-secret-not-for-production-use-32byte")
@SpringBootTest
class ApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
