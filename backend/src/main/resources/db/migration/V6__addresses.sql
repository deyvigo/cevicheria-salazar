-- Delivery addresses of a customer (HU-24), see docs/diagrama-de-base-de-datos.md.
-- No ON DELETE CASCADE: accounts are deactivated, not deleted, and orders will keep referencing the row.
CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    label VARCHAR(40) NOT NULL,
    address VARCHAR(200) NOT NULL,
    reference VARCHAR(200),
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id_active ON addresses (user_id) WHERE deleted_at IS NULL;
