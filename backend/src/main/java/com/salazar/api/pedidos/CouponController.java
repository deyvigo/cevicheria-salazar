package com.salazar.api.pedidos;

import com.salazar.api.pedidos.dto.CouponQuoteRequest;
import com.salazar.api.pedidos.dto.CouponQuoteResponse;
import com.salazar.api.perfil.AuthenticatedUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponController {
    private final CouponService couponService;

    @PostMapping("/quote")
    public CouponQuoteResponse quote(Authentication authentication, @Valid @RequestBody CouponQuoteRequest request) {
        return couponService.quote(AuthenticatedUser.id(authentication), request);
    }
}
