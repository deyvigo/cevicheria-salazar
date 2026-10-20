package com.salazar.api;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import java.nio.file.Path;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.images.builder.ImageFromDockerfile;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {
	@Bean
	@ServiceConnection
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(postgisImage());
	}

	// The official postgis/postgis image has no arm64 build, so the same Dockerfile as the dev compose is built (and cached by Docker)
	private static DockerImageName postgisImage() {
		String image = new ImageFromDockerfile("salazar-postgis-test", false)
				.withFileFromPath("Dockerfile", Path.of("..", "docker", "postgres", "Dockerfile"))
				.get();
		return DockerImageName.parse(image).asCompatibleSubstituteFor("postgres");
	}

	@Bean
	@ServiceConnection(name = "redis")
	GenericContainer<?> redisContainer() {
		return new GenericContainer<>(DockerImageName.parse("redis:latest")).withExposedPorts(6379);
	}

}
