package com.salazar.api.pedidos;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.common.exception.OrderNotFoundException;
import com.salazar.api.common.exception.PaymentGatewayException;
import com.salazar.api.pedidos.PaymentGateway.CheckoutRequest;
import com.salazar.api.pedidos.PaymentGateway.CheckoutSession;
import com.salazar.api.pedidos.dto.CreateOrderRequest;
import com.salazar.api.pedidos.dto.CreateOrderResponse;
import com.salazar.api.pedidos.dto.OrderResponse;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.pedidos.dto.OrderSummaryResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderService {
    private static final int PAGE_SIZE = 10;

    private final OrderLifecycleService lifecycle;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final PaymentGateway paymentGateway;

    public CreateOrderResponse create(Long userId, CreateOrderRequest request) {
        boolean cashOnDelivery = request.paymentMethod() == PaymentMethod.CONTRAENTREGA;
        if (cashOnDelivery && request.collection() == null) {
            throw new FieldInvalidException("collection", "Elige cómo pagarás.");
        }
        if (!cashOnDelivery && request.collection() != null) {
            throw new FieldInvalidException("collection", "El detalle de cobro solo aplica a la contraentrega.");
        }
        return cashOnDelivery ? createCashOnDeliveryOrder(userId, request) : createOnlineOrder(userId, request);
    }

    // No gateway involved: the order is confirmed as soon as the stock is reserved
    private CreateOrderResponse createCashOnDeliveryOrder(Long userId, CreateOrderRequest request) {
        Order order = lifecycle.place(userId, request);
        return new CreateOrderResponse(order.getId(), null);
    }

    // Deliberately not transactional: the stock reservation commits first and the call to the provider happens
    // outside it, so no row lock stays open during a network call. A provider failure is compensated by cancelling.
    private CreateOrderResponse createOnlineOrder(Long userId, CreateOrderRequest request) {
        Order order = lifecycle.place(userId, request);
        try {
            CheckoutSession session = paymentGateway.createCheckout(toCheckoutRequest(order));
            lifecycle.attachCheckout(order.getId(), session.preferenceId(), session.checkoutUrl());
            return new CreateOrderResponse(order.getId(), session.checkoutUrl());
        } catch (RuntimeException e) {
            lifecycle.cancelPending(order.getId(), OrderLifecycleService.CANCEL_GATEWAY_ERROR);
            if (e instanceof PaymentGatewayException) {
                throw e;
            }
            throw new PaymentGatewayException("No se pudo iniciar el pago.", e);
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> listPurchased(Long userId, int page) {
        requireCustomer(userId);
        int requested = Math.max(page, 1);
        Page<Order> result = findPurchased(userId, requested);
        // Same rule as the admin lists: a page that no longer exists falls back to the last one
        if (result.isEmpty() && requested > 1 && result.getTotalPages() > 0) {
            requested = result.getTotalPages();
            result = findPurchased(userId, requested);
        }
        List<Long> ids = result.getContent().stream().map(Order::getId).toList();
        Map<Long, List<String>> namesByOrder = new LinkedHashMap<>();
        if (!ids.isEmpty()) {
            for (OrderItem item : orderRepository.findItemsByOrderIds(ids)) {
                namesByOrder
                        .computeIfAbsent(item.getOrder().getId(), key -> new ArrayList<>())
                        .add(item.getProductName());
            }
        }
        List<OrderSummaryResponse> items = result.getContent().stream()
                .map(order -> new OrderSummaryResponse(
                        order.getId(),
                        order.getCode(),
                        namesByOrder.getOrDefault(order.getId(), List.of()),
                        order.getTotal(),
                        order.getPaidAt() != null ? order.getPaidAt() : order.getCreatedAt(),
                        order.getDeliveryStatus()))
                .toList();
        return new PageResponse<>(items, requested, PAGE_SIZE, result.getTotalElements(), result.getTotalPages());
    }

    private Page<Order> findPurchased(Long userId, int page) {
        return orderRepository.findPurchased(
                userId,
                List.of(OrderStatus.PAGADO, OrderStatus.PENDIENTE_COBRO),
                PageRequest.of(page - 1, PAGE_SIZE));
    }

    private User requireCustomer(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || !user.isActive()) {
            throw new InsufficientAuthenticationException("Usuario no encontrado.");
        }
        if (user.getRole() != UserRole.CLIENTE) {
            throw new AccessDeniedException("Solo los clientes ven pedidos.");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public OrderResponse getOwned(Long userId, Long orderId) {
        User customer = requireCustomer(userId);
        Order order = orderRepository.findByIdAndUserIdWithItems(orderId, userId).orElseThrow(OrderNotFoundException::new);
        String paymentStatus = paymentRepository
                .findFirstByOrderIdOrderByIdDesc(order.getId())
                .map(Payment::getStatus)
                .orElse(null);
        return OrderResponse.from(order, paymentStatus, customer.getFirstName() + " " + customer.getLastName());
    }

    private CheckoutRequest toCheckoutRequest(Order order) {
        List<CheckoutRequest.Line> lines = new ArrayList<>();
        order.getItems()
                .forEach(item -> lines.add(new CheckoutRequest.Line(item.getProductName(), item.getQuantity(), item.getUnitPrice())));
        if (order.getDeliveryPrice().signum() > 0) {
            lines.add(new CheckoutRequest.Line("Entrega", 1, order.getDeliveryPrice()));
        }
        return new CheckoutRequest(order.getId(), order.getCode(), lines, order.getExpiresAt());
    }
}
