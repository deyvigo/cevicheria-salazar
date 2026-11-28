package com.salazar.api.admin;

import com.salazar.api.admin.dto.AdminCouponResponse;
import com.salazar.api.admin.dto.CouponActiveRequest;
import com.salazar.api.admin.dto.CouponRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/coupons")
@RequiredArgsConstructor
public class AdminCouponController {
    private final AdminCouponService couponService;

    @GetMapping
    public List<AdminCouponResponse> list() {
        return couponService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminCouponResponse create(@Valid @RequestBody CouponRequest request) {
        return couponService.create(request);
    }

    @PutMapping("/{id}")
    public AdminCouponResponse update(@PathVariable Long id, @Valid @RequestBody CouponRequest request) {
        return couponService.update(id, request);
    }

    @PatchMapping("/{id}/active")
    public AdminCouponResponse setActive(@PathVariable Long id, @Valid @RequestBody CouponActiveRequest request) {
        return couponService.setActive(id, request.active());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        couponService.delete(id);
    }
}
