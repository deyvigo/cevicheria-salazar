package com.salazar.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import(TestcontainersConfiguration.class)
@WithTestSecrets
@SpringBootTest
class ApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
