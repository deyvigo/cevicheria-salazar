package com.salazar.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.salazar.api.admin.dto.ZoneCoordinate;
import com.salazar.api.common.exception.FieldInvalidException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Polygon;

class ZoneAreaMapperTest {
    private static ZoneCoordinate point(String latitude, String longitude) {
        return new ZoneCoordinate(new BigDecimal(latitude), new BigDecimal(longitude));
    }

    private static final List<ZoneCoordinate> TRIANGLE =
            List.of(point("-12.04", "-77.04"), point("-12.04", "-77.02"), point("-12.06", "-77.03"));

    @Test
    void buildsAClosedPolygonWithLongitudeAsX() {
        Polygon polygon = ZoneAreaMapper.toPolygon(TRIANGLE);

        assertThat(polygon.getSRID()).isEqualTo(4326);
        assertThat(polygon.getExteriorRing().getNumPoints()).isEqualTo(4);
        assertThat(polygon.getCoordinates()[0].x).isEqualTo(-77.04);
        assertThat(polygon.getCoordinates()[0].y).isEqualTo(-12.04);
    }

    @Test
    void returnsTheRingWithoutTheClosingVertex() {
        List<ZoneCoordinate> coordinates = ZoneAreaMapper.toCoordinates(ZoneAreaMapper.toPolygon(TRIANGLE));

        assertThat(coordinates).hasSize(3);
        assertThat(coordinates.get(0).latitude()).isEqualByComparingTo("-12.04");
        assertThat(coordinates.get(0).longitude()).isEqualByComparingTo("-77.04");
    }

    @Test
    void rejectsSidesThatCross() {
        List<ZoneCoordinate> bowtie =
                List.of(point("-12.04", "-77.04"), point("-12.06", "-77.02"), point("-12.04", "-77.02"), point("-12.06", "-77.04"));

        assertThatThrownBy(() -> ZoneAreaMapper.toPolygon(bowtie))
                .isInstanceOf(FieldInvalidException.class)
                .hasFieldOrPropertyWithValue("field", "coordinates");
    }

    @Test
    void rejectsCollinearPointsWithNoArea() {
        List<ZoneCoordinate> line = List.of(point("-12.04", "-77.04"), point("-12.05", "-77.03"), point("-12.06", "-77.02"));

        assertThatThrownBy(() -> ZoneAreaMapper.toPolygon(line)).isInstanceOf(FieldInvalidException.class);
    }
}
