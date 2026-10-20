package com.salazar.api.admin;

import com.salazar.api.admin.dto.ZoneCoordinate;
import com.salazar.api.common.exception.FieldInvalidException;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.geom.PrecisionModel;

public final class ZoneAreaMapper {
    private static final int WGS84 = 4326;
    // About one square meter in degrees: anything smaller is a degenerate zone (collinear points) rather than a drawn area
    private static final double MIN_AREA = 1e-10;
    private static final GeometryFactory FACTORY = new GeometryFactory(new PrecisionModel(), WGS84);

    private ZoneAreaMapper() {}

    /** Builds the polygon, closing the ring; rejects shapes that cross themselves or have no area. */
    public static Polygon toPolygon(List<ZoneCoordinate> coordinates) {
        int size = coordinates.size();
        Coordinate[] ring = new Coordinate[size + 1];
        for (int i = 0; i < size; i++) {
            ZoneCoordinate point = coordinates.get(i);
            // JTS orders coordinates as x = longitude, y = latitude
            ring[i] = new Coordinate(point.longitude().doubleValue(), point.latitude().doubleValue());
        }
        ring[size] = ring[0].copy();
        Polygon polygon = FACTORY.createPolygon(ring);
        if (!polygon.isValid() || polygon.getArea() < MIN_AREA) {
            throw new FieldInvalidException("coordinates", "Los lados de la zona no pueden cruzarse.");
        }
        return polygon;
    }

    /** Returns the exterior ring without the closing vertex that repeats the first one. */
    public static List<ZoneCoordinate> toCoordinates(Polygon polygon) {
        Coordinate[] ring = polygon.getExteriorRing().getCoordinates();
        return Arrays.stream(ring, 0, ring.length - 1)
                .map(c -> new ZoneCoordinate(BigDecimal.valueOf(c.y), BigDecimal.valueOf(c.x)))
                .toList();
    }
}
