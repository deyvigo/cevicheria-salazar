package com.salazar.api.pedidos;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByProviderAndProviderPaymentId(String provider, String providerPaymentId);

    Optional<Payment> findFirstByOrderIdOrderByIdDesc(Long orderId);

    boolean existsByOrderIdAndStatus(Long orderId, String status);
}
