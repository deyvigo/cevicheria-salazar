package com.salazar.api.admin.dto;

import com.salazar.api.admin.ZoneAreaMapper;
import com.salazar.api.pedidos.DeliveryZone;
import java.math.BigDecimal;
import java.util.List;

public record DeliveryZoneResponse(
        Long id, String name, BigDecimal price, String color, boolean active, List<ZoneCoordinate> coordinates) {
    public static DeliveryZoneResponse from(DeliveryZone zone) {
        return new DeliveryZoneResponse(
                zone.getId(),
                zone.getName(),
                zone.getPrice(),
                zone.getColor(),
                zone.isActive(),
                ZoneAreaMapper.toCoordinates(zone.getArea()));
    }
}
