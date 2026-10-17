package com.salazar.api.perfil;

import com.salazar.api.perfil.dto.AddressRequest;
import com.salazar.api.perfil.dto.AddressResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/perfil/direcciones")
@RequiredArgsConstructor
public class AddressController {
    private final AddressService addressService;

    @GetMapping
    public List<AddressResponse> list(Authentication authentication) {
        return addressService.list(AuthenticatedUser.id(authentication));
    }

    @PostMapping
    public ResponseEntity<AddressResponse> create(
            Authentication authentication, @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(addressService.create(AuthenticatedUser.id(authentication), request));
    }

    @PutMapping("/{id}")
    public AddressResponse update(
            Authentication authentication, @PathVariable Long id, @Valid @RequestBody AddressRequest request) {
        return addressService.update(AuthenticatedUser.id(authentication), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long id) {
        addressService.delete(AuthenticatedUser.id(authentication), id);
        return ResponseEntity.noContent().build();
    }
}
