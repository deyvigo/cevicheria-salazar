package com.salazar.api.admin;

import com.salazar.api.admin.dto.DeliveryZoneRequest;
import com.salazar.api.admin.dto.DeliveryZoneResponse;
import com.salazar.api.common.exception.DeliveryZoneNotFoundException;
import com.salazar.api.common.exception.FieldConflictException;
import com.salazar.api.pedidos.DeliveryZone;
import com.salazar.api.pedidos.DeliveryZoneRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminDeliveryZoneService {
    private static final String NAME_TAKEN = "Ya existe una zona con ese nombre.";

    private final DeliveryZoneRepository zoneRepository;

    @Transactional(readOnly = true)
    public List<DeliveryZoneResponse> list() {
        return zoneRepository.findAllOrdered().stream().map(DeliveryZoneResponse::from).toList();
    }

    @Transactional
    public DeliveryZoneResponse create(DeliveryZoneRequest request) {
        if (zoneRepository.existsByNameIgnoreCase(request.name())) throw new FieldConflictException("name", NAME_TAKEN);
        DeliveryZone zone = new DeliveryZone(
                request.name(),
                request.price(),
                request.color(),
                ZoneAreaMapper.toPolygon(request.coordinates()),
                request.active());
        save(zone);
        return DeliveryZoneResponse.from(zone);
    }

    @Transactional
    public DeliveryZoneResponse update(Long id, DeliveryZoneRequest request) {
        DeliveryZone zone = zoneRepository.findById(id).orElseThrow(DeliveryZoneNotFoundException::new);
        if (zoneRepository.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new FieldConflictException("name", NAME_TAKEN);
        }
        zone.update(
                request.name(),
                request.price(),
                request.color(),
                ZoneAreaMapper.toPolygon(request.coordinates()),
                request.active());
        save(zone);
        return DeliveryZoneResponse.from(zone);
    }

    @Transactional
    public void delete(Long id) {
        zoneRepository.delete(zoneRepository.findById(id).orElseThrow(DeliveryZoneNotFoundException::new));
    }

    private void save(DeliveryZone zone) {
        try {
            zoneRepository.saveAndFlush(zone);
        } catch (DataIntegrityViolationException ex) {
            // Two requests passed the availability check at once; the unique index decides
            String message = String.valueOf(ex.getMostSpecificCause().getMessage());
            if (message.contains("uq_delivery_zones_name_lower")) throw new FieldConflictException("name", NAME_TAKEN);
            throw ex;
        }
    }
}
