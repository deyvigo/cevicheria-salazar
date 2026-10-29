package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.salazar.api.pedidos.dto.DeliveryCostResponse;
import com.salazar.api.perfil.Address;
import com.salazar.api.perfil.AddressService;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DeliveryCostServiceTest {
    private static final long USER_ID = 7L;

    @Mock
    private AddressService addressService;

    @Mock
    private DeliveryZoneRepository zoneRepository;

    private Address address() {
        return new Address(USER_ID, "Casa", "Calle 1", null, new BigDecimal("-12.050000"), new BigDecimal("-77.030000"));
    }

    @Test
    void returnsThePriceAndNameOfTheZoneThatCoversTheAddress() {
        DeliveryZone zone = mock(DeliveryZone.class);
        when(zone.getPrice()).thenReturn(new BigDecimal("8.50"));
        when(zone.getName()).thenReturn("Miraflores");
        when(addressService.getOwned(USER_ID, 3L)).thenReturn(address());
        when(zoneRepository.findCheapestCovering(-77.03, -12.05)).thenReturn(Optional.of(zone));

        DeliveryCostResponse response = new DeliveryCostService(addressService, zoneRepository).calculate(USER_ID, 3L);

        assertThat(response).isEqualTo(new DeliveryCostResponse(true, new BigDecimal("8.50"), "Miraflores"));
    }

    @Test
    void anAddressOutsideEveryZoneIsNotCoveredAndCostsZero() {
        when(addressService.getOwned(USER_ID, 3L)).thenReturn(address());
        when(zoneRepository.findCheapestCovering(-77.03, -12.05)).thenReturn(Optional.empty());

        DeliveryCostResponse response = new DeliveryCostService(addressService, zoneRepository).calculate(USER_ID, 3L);

        assertThat(response.covered()).isFalse();
        assertThat(response.price()).isEqualByComparingTo("0");
        assertThat(response.zone()).isNull();
    }
}
