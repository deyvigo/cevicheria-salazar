package com.salazar.api.pedidos;

import com.salazar.api.pedidos.dto.DeliveryCostResponse;
import com.salazar.api.perfil.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders/delivery-cost")
@RequiredArgsConstructor
public class DeliveryCostController {
    private final DeliveryCostService deliveryCostService;

    @GetMapping
    public DeliveryCostResponse get(Authentication authentication, @RequestParam Long addressId) {
        return deliveryCostService.calculate(AuthenticatedUser.id(authentication), addressId);
    }
}
