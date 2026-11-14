package com.salazar.api.pedidos;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.catalogo.Product;
import com.salazar.api.catalogo.ProductRepository;
import com.salazar.api.common.exception.DeliveryNotCoveredException;
import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.common.exception.InsufficientStockException;
import com.salazar.api.common.exception.OrderNotFoundException;
import com.salazar.api.common.exception.ProductUnavailableException;
import com.salazar.api.pedidos.dto.CreateOrderRequest;
import com.salazar.api.perfil.Address;
import com.salazar.api.perfil.AddressService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Every database change of an order's life: placing it (reserving stock), cancelling it (releasing stock) and paying it. */
@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(OrderProperties.class)
public class OrderLifecycleService {
    public static final String CANCEL_GATEWAY_ERROR = "ERROR_PASARELA";
    public static final String CANCEL_EXPIRED = "VENCIDO";
    public static final String CANCEL_REPLACED = "REEMPLAZADO";

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final DeliveryZoneRepository zoneRepository;
    private final AddressService addressService;
    private final OrderCodeGenerator codeGenerator;
    private final OrderProperties properties;
    private final ApplicationEventPublisher events;

    @Transactional
    public Order place(Long userId, CreateOrderRequest request) {
        // Row lock on the customer serializes their own concurrent orders, so "cancel the previous pending one" is safe
        User user = userRepository.findByIdForUpdate(userId).orElse(null);
        requireCustomer(user);

        Map<Long, Integer> wanted = mergeItems(request);
        List<Order> previous = orderRepository.findAllByUserIdAndStatus(userId, OrderStatus.PENDIENTE_PAGO);

        // One ordered lock over every dish involved (new items and the ones about to be released) to avoid deadlocks
        Set<Long> productIds = new TreeSet<>(wanted.keySet());
        previous.forEach(order -> order.getItems().forEach(item -> productIds.add(item.getProductId())));
        Map<Long, Product> products = new HashMap<>();
        productRepository.findAllByIdInForUpdate(productIds).forEach(product -> products.put(product.getId(), product));

        for (Order order : previous) {
            release(order, products, CANCEL_REPLACED);
        }

        BigDecimal subtotal = BigDecimal.ZERO.setScale(2);
        List<Object[]> lines = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : wanted.entrySet()) {
            Product product = products.get(entry.getKey());
            if (product == null || !product.isActive() || product.getDeletedAt() != null || !product.isAvailable()) {
                throw product == null ? new ProductUnavailableException() : new ProductUnavailableException(product.getName());
            }
            if (product.getStock() < entry.getValue()) {
                throw product.getStock() <= 0
                        ? new ProductUnavailableException(product.getName())
                        : new InsufficientStockException(product.getName(), product.getStock());
            }
            subtotal = subtotal.add(product.getPrice().multiply(BigDecimal.valueOf(entry.getValue())));
            lines.add(new Object[] {product, entry.getValue()});
        }

        boolean delivery = request.deliveryType() == DeliveryType.ENTREGA;
        Address address = null;
        DeliveryZone zone = null;
        if (delivery) {
            if (request.addressId() == null) {
                throw new FieldInvalidException("addressId", "Elige una dirección de entrega.");
            }
            address = addressService.getOwned(userId, request.addressId());
            zone = zoneRepository
                    .findCheapestCovering(address.getLongitude().doubleValue(), address.getLatitude().doubleValue())
                    .orElseThrow(DeliveryNotCoveredException::new);
        }

        BigDecimal deliveryPrice = zone == null ? BigDecimal.ZERO.setScale(2) : zone.getPrice();
        boolean cashOnDelivery = request.paymentMethod() == PaymentMethod.CONTRAENTREGA;
        BigDecimal cashAmount = cashOnDelivery && request.collection().method() == CollectionMethod.EFECTIVO
                ? request.collection().cashAmount()
                : null;
        // Checked before any stock is taken so a short amount never reserves anything
        if (cashAmount != null && cashAmount.compareTo(subtotal.add(deliveryPrice)) < 0) {
            throw new FieldInvalidException(
                    "cashAmount",
                    "El monto debe ser al menos S/ " + subtotal.add(deliveryPrice).setScale(2, RoundingMode.UNNECESSARY) + ".");
        }

        Order order = new Order(
                userId,
                codeGenerator.nextOrderCode(),
                codeGenerator.nextDeliveryCode(),
                request.paymentMethod(),
                request.deliveryType(),
                subtotal,
                deliveryPrice,
                // Cash on delivery is confirmed right away and never expires
                cashOnDelivery ? null : Instant.now().plus(properties.paymentTtl()));
        if (cashOnDelivery) {
            order.setCollection(request.collection().method(), cashAmount);
        }
        if (address != null) {
            order.setDeliveryAddress(
                    address.getId(),
                    address.getLabel(),
                    address.getAddress(),
                    address.getReference(),
                    address.getLatitude(),
                    address.getLongitude(),
                    zone.getName());
        }
        for (Object[] line : lines) {
            Product product = (Product) line[0];
            int quantity = (Integer) line[1];
            order.addItem(product.getId(), product.getName(), product.getPrice(), quantity);
            product.decreaseStock(quantity);
        }
        Order saved = orderRepository.save(order);
        if (cashOnDelivery) {
            // Online orders reach the admin panel only once they are paid
            events.publishEvent(new OrderChangedEvent(OrderChangedEvent.Type.CREATED, saved.getId()));
            events.publishEvent(new OrderConfirmedEvent(saved.getId()));
        }
        return saved;
    }

    @Transactional
    public void attachCheckout(Long orderId, String preferenceId, String checkoutUrl) {
        orderRepository
                .findByIdForUpdate(orderId)
                .orElseThrow(OrderNotFoundException::new)
                .attachCheckout(preferenceId, checkoutUrl);
    }

    /** Cancels a pending order and gives its stock back. Idempotent: anything not pending is left untouched. */
    @Transactional
    public boolean cancelPending(Long orderId, String reason) {
        Order order = orderRepository.findByIdForUpdate(orderId).orElse(null);
        if (order == null || !order.isPending()) {
            return false;
        }
        Set<Long> ids = new TreeSet<>();
        order.getItems().forEach(item -> ids.add(item.getProductId()));
        Map<Long, Product> products = new HashMap<>();
        productRepository.findAllByIdInForUpdate(ids).forEach(product -> products.put(product.getId(), product));
        release(order, products, reason);
        return true;
    }

    private void release(Order order, Map<Long, Product> lockedProducts, String reason) {
        order.cancel(reason);
        for (OrderItem item : order.getItems()) {
            Product product = lockedProducts.get(item.getProductId());
            if (product != null) {
                product.increaseStock(item.getQuantity());
            }
        }
    }

    private Map<Long, Integer> mergeItems(CreateOrderRequest request) {
        Map<Long, Integer> wanted = new LinkedHashMap<>();
        for (CreateOrderRequest.Item item : request.items()) {
            wanted.merge(item.productId(), item.quantity(), Integer::sum);
        }
        return wanted;
    }

    private void requireCustomer(User user) {
        if (user == null || !user.isActive()) {
            throw new InsufficientAuthenticationException("Usuario no encontrado.");
        }
        if (user.getRole() != UserRole.CLIENTE) {
            throw new AccessDeniedException("Solo los clientes hacen pedidos.");
        }
    }
}
