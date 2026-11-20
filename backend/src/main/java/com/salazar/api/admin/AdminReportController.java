package com.salazar.api.admin;

import com.salazar.api.admin.dto.SalesReport;
import com.salazar.api.pedidos.DeliveryType;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {
    private final AdminReportService reportService;

    @GetMapping("/sales")
    public SalesReport sales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) AdminOrderFilter.Payment payment,
            @RequestParam(required = false) DeliveryType type) {
        return reportService.sales(from, to, payment, type);
    }
}
