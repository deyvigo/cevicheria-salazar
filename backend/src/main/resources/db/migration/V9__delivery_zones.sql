-- Delivery price zones drawn by the administrator (HU-37), see docs/diagrama-de-base-de-datos.md.
-- Zones may overlap; deleting one is a hard delete because nothing references it yet.
CREATE TABLE delivery_zones (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    price NUMERIC(4, 2) NOT NULL CHECK (price > 0),
    color VARCHAR(20) NOT NULL,
    area geometry(Polygon, 4326) NOT NULL CHECK (ST_IsValid(area)),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_delivery_zones_name_lower ON delivery_zones (lower(name));
CREATE INDEX idx_delivery_zones_area ON delivery_zones USING GIST (area);
