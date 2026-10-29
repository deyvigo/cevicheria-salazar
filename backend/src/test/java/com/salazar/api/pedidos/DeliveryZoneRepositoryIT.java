package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.salazar.api.TestcontainersConfiguration;
import com.salazar.api.WithTestSecrets;
import com.salazar.api.admin.ZoneAreaMapper;
import com.salazar.api.admin.dto.ZoneCoordinate;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@WithTestSecrets
class DeliveryZoneRepositoryIT {
    private static final String SQUARE = "ST_GeomFromText('POLYGON((-77.04 -12.04, -77.02 -12.04, -77.02 -12.06, -77.04 -12.06, -77.04 -12.04))', 4326)";
    private static final String BOWTIE = "ST_GeomFromText('POLYGON((-77.04 -12.04, -77.02 -12.06, -77.02 -12.04, -77.04 -12.06, -77.04 -12.04))', 4326)";

    @Autowired
    private DeliveryZoneRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @AfterEach
    void clean() {
        jdbcTemplate.update("DELETE FROM delivery_zones");
    }

    private static ZoneCoordinate point(String latitude, String longitude) {
        return new ZoneCoordinate(new BigDecimal(latitude), new BigDecimal(longitude));
    }

    private int insert(String name, String price, String geometry) {
        return jdbcTemplate.update(
                "INSERT INTO delivery_zones (name, price, color, area) VALUES (?, " + price + ", 'lima', " + geometry + ")",
                name);
    }

    @Test
    void savesAndReadsAPolygonWithTheSameCoordinates() {
        var area = ZoneAreaMapper.toPolygon(
                List.of(point("-12.04", "-77.04"), point("-12.04", "-77.02"), point("-12.06", "-77.03")));
        Long id = repository.saveAndFlush(new DeliveryZone("Miraflores", new BigDecimal("8.50"), "celeste", area, true))
                .getId();

        DeliveryZone found = repository.findById(id).orElseThrow();

        assertThat(found.getArea().getSRID()).isEqualTo(4326);
        assertThat(ZoneAreaMapper.toCoordinates(found.getArea())).hasSize(3);
        assertThat(found.getPrice()).isEqualByComparingTo("8.50");
        assertThat(found.isActive()).isTrue();
    }

    @Test
    void theDatabaseRejectsAPolygonWhoseSidesCross() {
        assertThatThrownBy(() -> insert("Moño", "5", BOWTIE)).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(insert("Cuadrado", "5", SQUARE)).isEqualTo(1);
    }

    @Test
    void theDatabaseRejectsPricesOutsideTheRange() {
        assertThatThrownBy(() -> insert("Gratis", "0", SQUARE)).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert("Caro", "100", SQUARE)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theNameIsUniqueIgnoringCase() {
        insert("Miraflores", "5", SQUARE);

        assertThatThrownBy(() -> insert("miraflores", "5", SQUARE))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uq_delivery_zones_name_lower");
        assertThat(repository.existsByNameIgnoreCase("MIRAFLORES")).isTrue();
    }

    @Test
    void listsByNameIgnoringCase() {
        insert("barranco", "5", SQUARE);
        insert("Surco", "5", SQUARE);
        insert("Ate", "5", SQUARE);

        assertThat(repository.findAllOrdered()).extracting(DeliveryZone::getName).containsExactly("Ate", "barranco", "Surco");
    }

    // Square 1: lng -77.04..-77.02, lat -12.06..-12.04. Square 2 overlaps its eastern half.
    private static final String OVERLAP = "ST_GeomFromText('POLYGON((-77.03 -12.04, -77.01 -12.04, -77.01 -12.06, -77.03 -12.06, -77.03 -12.04))', 4326)";

    private void insertInactive(String name, String price, String geometry) {
        jdbcTemplate.update(
                "INSERT INTO delivery_zones (name, price, color, area, active) VALUES (?, " + price + ", 'lima', " + geometry + ", false)",
                name);
    }

    @Test
    void findsTheZoneContainingAPointAndNothingOutsideIt() {
        insert("Cuadrado", "6.50", SQUARE);

        assertThat(repository.findCheapestCovering(-77.03, -12.05)).get().extracting(DeliveryZone::getName).isEqualTo("Cuadrado");
        assertThat(repository.findCheapestCovering(-77.00, -12.05)).isEmpty();
    }

    @Test
    void aPointOnTheBorderCountsAsInside() {
        insert("Cuadrado", "6.50", SQUARE);

        assertThat(repository.findCheapestCovering(-77.04, -12.05)).isPresent();
        assertThat(repository.findCheapestCovering(-77.02, -12.04)).isPresent();
    }

    @Test
    void ignoresInactiveZones() {
        insertInactive("Cuadrado", "6.50", SQUARE);

        assertThat(repository.findCheapestCovering(-77.03, -12.05)).isEmpty();
    }

    @Test
    void withOverlappingZonesTheCheapestWinsAndTiesGoToTheLowestId() {
        insert("Cara", "9.00", SQUARE);
        insert("Barata", "4.00", OVERLAP);

        assertThat(repository.findCheapestCovering(-77.025, -12.05)).get().extracting(DeliveryZone::getName).isEqualTo("Barata");
        assertThat(repository.findCheapestCovering(-77.035, -12.05)).get().extracting(DeliveryZone::getName).isEqualTo("Cara");

        clean();
        insert("Primera", "5.00", SQUARE);
        insert("Segunda", "5.00", OVERLAP);

        assertThat(repository.findCheapestCovering(-77.025, -12.05)).get().extracting(DeliveryZone::getName).isEqualTo("Primera");
    }
}
