package com.salazar.api.pedidos;

import com.salazar.api.pedidos.dto.DeliveryCostResponse;
import com.salazar.api.perfil.Address;
import com.salazar.api.perfil.AddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DeliveryCostService {
    private final AddressService addressService;
    private final DeliveryZoneRepository zoneRepository;

    @Transactional(readOnly = true)
    public DeliveryCostResponse calculate(Long userId, Long addressId) {
        Address address = addressService.getOwned(userId, addressId);
        return zoneRepository
                .findCheapestCovering(address.getLongitude().doubleValue(), address.getLatitude().doubleValue())
                .map(zone -> new DeliveryCostResponse(true, zone.getPrice(), zone.getName()))
                .orElseGet(DeliveryCostResponse::notCovered);
    }
}
