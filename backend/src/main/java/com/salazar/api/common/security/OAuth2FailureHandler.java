package com.salazar.api.common.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

/** Cubre que la persona cancele o rechace el acceso en la pantalla de Google (HU-06). */
@Component
public class OAuth2FailureHandler extends SimpleUrlAuthenticationFailureHandler {

    public OAuth2FailureHandler(@Value("${app.frontend-url}") String frontendUrl) {
        super(frontendUrl + "/iniciar-sesion?error=google");
    }
}
