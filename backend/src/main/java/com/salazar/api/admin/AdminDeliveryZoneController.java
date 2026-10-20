package com.salazar.api.admin;

import com.salazar.api.admin.dto.DeliveryZoneRequest;
import com.salazar.api.admin.dto.DeliveryZoneResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/delivery-zones")
@RequiredArgsConstructor
public class AdminDeliveryZoneController {
    private final AdminDeliveryZoneService zoneService;

    @GetMapping
    public List<DeliveryZoneResponse> list() {
        return zoneService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DeliveryZoneResponse create(@Valid @RequestBody DeliveryZoneRequest request) {
        return zoneService.create(request);
    }

    @PutMapping("/{id}")
    public DeliveryZoneResponse update(@PathVariable Long id, @Valid @RequestBody DeliveryZoneRequest request) {
        return zoneService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        zoneService.delete(id);
    }
}
