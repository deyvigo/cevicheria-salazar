package com.salazar.api.perfil.dto;

import com.salazar.api.perfil.Address;
import java.math.BigDecimal;

public record AddressResponse(
        Long id, String label, String address, String reference, BigDecimal latitude, BigDecimal longitude) {
    public static AddressResponse from(Address entity) {
        return new AddressResponse(
                entity.getId(),
                entity.getLabel(),
                entity.getAddress(),
                entity.getReference(),
                entity.getLatitude(),
                entity.getLongitude());
    }
}
