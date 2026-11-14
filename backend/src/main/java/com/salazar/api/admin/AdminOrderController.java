package com.salazar.api.admin;

import com.salazar.api.admin.dto.AdminOrderDetail;
import com.salazar.api.admin.dto.AdminOrderRow;
import com.salazar.api.catalogo.dto.PageResponse;
import com.salazar.api.pedidos.DeliveryStatus;
import com.salazar.api.pedidos.DeliveryType;
import com.salazar.api.pedidos.OrderStatus;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {
    private final AdminOrderService orderService;
    private final AdminOrderEventsService eventsService;

    @GetMapping
    public PageResponse<AdminOrderRow> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String dir,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "ACTIVE") AdminOrderFilter.DeliveryStage deliveryStatus,
            @RequestParam(required = false) DeliveryType type,
            @RequestParam(required = false) AdminOrderFilter.Payment payment,
            @RequestParam(required = false) OrderStatus paymentStatus,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        AdminOrderFilter filter = new AdminOrderFilter(
                deliveryStatus, type, payment, paymentStatus, blankToNull(zone), blankToNull(q), from, to);
        return orderService.list(filter, AdminOrderSort.from(sort), !"asc".equalsIgnoreCase(dir), page);
    }

    @GetMapping("/zones")
    public List<String> zones() {
        return orderService.zones();
    }

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(@RequestHeader(value = "Last-Event-ID", required = false) String lastEventId) {
        return eventsService.subscribe(lastEventId);
    }

    @GetMapping("/{id}")
    public AdminOrderDetail detail(@PathVariable Long id) {
        return orderService.detail(id);
    }

    @PatchMapping("/{id}/delivery-status")
    public AdminOrderRow advance(@PathVariable Long id, @RequestParam DeliveryStatus from) {
        return orderService.advance(id, from);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
