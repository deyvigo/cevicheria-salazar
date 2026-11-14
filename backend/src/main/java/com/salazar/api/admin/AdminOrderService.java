package com.salazar.api.admin;

import com.salazar.api.admin.dto.AdminOrderDetail;
import com.salazar.api.admin.dto.AdminOrderRow;
import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.common.exception.FieldInvalidException;
import com.salazar.api.common.exception.OrderNotFoundException;
import com.salazar.api.pedidos.DeliveryStatus;
import com.salazar.api.pedidos.Order;
import com.salazar.api.pedidos.OrderChangedEvent;
import com.salazar.api.pedidos.OrderRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminOrderService {
    static final int PAGE_SIZE = 15;

    private final AdminOrderQuery query;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public PageResponse<AdminOrderRow> list(
            AdminOrderFilter filter, AdminOrderSort sort, boolean descending, int page) {
        if (filter.from() != null && filter.to() != null && filter.from().isAfter(filter.to())) {
            throw new FieldInvalidException("from", "La fecha inicial no puede ser posterior a la final.");
        }
        long total = query.count(filter);
        int totalPages = (int) Math.ceil(total / (double) PAGE_SIZE);
        // A page that no longer exists falls back to the last one, as in the other admin lists
        int current = totalPages == 0 ? 1 : Math.min(Math.max(page, 1), totalPages);
        List<AdminOrderRow> items = query.find(filter, sort, descending, (current - 1) * PAGE_SIZE, PAGE_SIZE).stream()
                .map(row -> AdminOrderRow.from(row.order(), row.customerName()))
                .toList();
        return new PageResponse<>(items, current, PAGE_SIZE, total, totalPages);
    }

    @Transactional(readOnly = true)
    public AdminOrderDetail detail(Long id) {
        Order order = orderRepository.findByIdWithItems(id).filter(Order::isConfirmed).orElseThrow(OrderNotFoundException::new);
        User customer = userRepository.findById(order.getUserId()).orElseThrow(OrderNotFoundException::new);
        return AdminOrderDetail.from(order, name(customer), customer.getPhone());
    }

    @Transactional
    public AdminOrderRow advance(Long id, DeliveryStatus from) {
        // Row lock: two administrators pressing the same button can't move the order twice
        Order order = orderRepository.findByIdForUpdate(id).filter(Order::isConfirmed).orElseThrow(OrderNotFoundException::new);
        order.advanceDelivery(from);
        events.publishEvent(new OrderChangedEvent(OrderChangedEvent.Type.UPDATED, order.getId()));
        User customer = userRepository.findById(order.getUserId()).orElseThrow(OrderNotFoundException::new);
        return AdminOrderRow.from(order, name(customer));
    }

    @Transactional(readOnly = true)
    public List<String> zones() {
        return query.zoneNames();
    }

    private String name(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}
