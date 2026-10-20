package com.salazar.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.admin.dto.DeliveryZoneRequest;
import com.salazar.api.admin.dto.DeliveryZoneResponse;
import com.salazar.api.admin.dto.ZoneCoordinate;
import com.salazar.api.common.exception.DeliveryZoneNotFoundException;
import com.salazar.api.common.exception.FieldConflictException;
import com.salazar.api.pedidos.DeliveryZone;
import com.salazar.api.pedidos.DeliveryZoneRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class AdminDeliveryZoneServiceTest {
    @Mock
    private DeliveryZoneRepository zoneRepository;

    private AdminDeliveryZoneService service() {
        return new AdminDeliveryZoneService(zoneRepository);
    }

    private static ZoneCoordinate point(String latitude, String longitude) {
        return new ZoneCoordinate(new BigDecimal(latitude), new BigDecimal(longitude));
    }

    private static DeliveryZoneRequest request(String name, boolean active) {
        return new DeliveryZoneRequest(
                name,
                new BigDecimal("8.00"),
                "celeste",
                active,
                List.of(point("-12.04", "-77.04"), point("-12.04", "-77.02"), point("-12.06", "-77.03")));
    }

    private static DeliveryZone zone(String name) {
        return new DeliveryZone(
                name, new BigDecimal("5.00"), "lima", ZoneAreaMapper.toPolygon(request(name, true).coordinates()), true);
    }

    @Test
    void requestStripsTheName() {
        assertThat(request("  Miraflores  ", true).name()).isEqualTo("Miraflores");
    }

    @Test
    void createsAZone() {
        when(zoneRepository.existsByNameIgnoreCase("Miraflores")).thenReturn(false);

        DeliveryZoneResponse response = service().create(request("Miraflores", false));

        assertThat(response.name()).isEqualTo("Miraflores");
        assertThat(response.active()).isFalse();
        assertThat(response.coordinates()).hasSize(3);
        verify(zoneRepository).saveAndFlush(any(DeliveryZone.class));
    }

    @Test
    void rejectsARepeatedNameIgnoringCase() {
        when(zoneRepository.existsByNameIgnoreCase("miraflores")).thenReturn(true);

        assertThatThrownBy(() -> service().create(request("miraflores", true)))
                .isInstanceOf(FieldConflictException.class)
                .hasFieldOrPropertyWithValue("field", "name");
        verify(zoneRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateIgnoresTheZoneItself() {
        DeliveryZone existing = zone("Miraflores");
        when(zoneRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(zoneRepository.existsByNameIgnoreCaseAndIdNot("Miraflores", 1L)).thenReturn(false);

        DeliveryZoneResponse response = service().update(1L, request("Miraflores", false));

        assertThat(response.active()).isFalse();
        assertThat(existing.isActive()).isFalse();
        assertThat(existing.getColor()).isEqualTo("celeste");
    }

    @Test
    void updateRejectsTheNameOfAnotherZone() {
        when(zoneRepository.findById(1L)).thenReturn(Optional.of(zone("Barranco")));
        when(zoneRepository.existsByNameIgnoreCaseAndIdNot("Miraflores", 1L)).thenReturn(true);

        assertThatThrownBy(() -> service().update(1L, request("Miraflores", true)))
                .isInstanceOf(FieldConflictException.class);
    }

    @Test
    void updateAndDeleteOfAMissingZoneAreNotFound() {
        when(zoneRepository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().update(9L, request("Miraflores", true)))
                .isInstanceOf(DeliveryZoneNotFoundException.class);
        assertThatThrownBy(() -> service().delete(9L)).isInstanceOf(DeliveryZoneNotFoundException.class);
    }

    @Test
    void translatesTheUniqueIndexViolationOfARace() {
        when(zoneRepository.existsByNameIgnoreCase("Miraflores")).thenReturn(false);
        when(zoneRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException(
                        "duplicate", new RuntimeException("violates unique constraint \"uq_delivery_zones_name_lower\"")));

        assertThatThrownBy(() -> service().create(request("Miraflores", true)))
                .isInstanceOf(FieldConflictException.class)
                .hasFieldOrPropertyWithValue("field", "name");
    }

    @Test
    void deletesAZone() {
        DeliveryZone existing = zone("Miraflores");
        when(zoneRepository.findById(1L)).thenReturn(Optional.of(existing));

        service().delete(1L);

        verify(zoneRepository).delete(existing);
    }
}
