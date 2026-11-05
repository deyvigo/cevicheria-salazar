package com.salazar.api.pedidos;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

@Component
public class OrderCodeGenerator {
    private final SecureRandom random = new SecureRandom();
    private final OrderRepository orderRepository;

    public OrderCodeGenerator(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Sequence-backed so concurrent orders never collide and the codes read in order (SAL-001042)
    public String nextOrderCode() {
        return String.format("SAL-%06d", orderRepository.nextCodeNumber());
    }

    // Four random digits; it only identifies the owner together with the order code, so repeats are fine
    public String nextDeliveryCode() {
        return String.format("%04d", random.nextInt(10_000));
    }
}
