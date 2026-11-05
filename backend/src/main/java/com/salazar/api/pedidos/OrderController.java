package com.salazar.api.pedidos;

import com.salazar.api.pedidos.dto.CreateOrderRequest;
import com.salazar.api.pedidos.dto.CreateOrderResponse;
import com.salazar.api.pedidos.dto.OrderResponse;
import com.salazar.api.perfil.AuthenticatedUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateOrderResponse create(Authentication authentication, @Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(AuthenticatedUser.id(authentication), request);
    }

    @GetMapping("/{id}")
    public OrderResponse get(Authentication authentication, @PathVariable Long id) {
        return orderService.getOwned(AuthenticatedUser.id(authentication), id);
    }
}
