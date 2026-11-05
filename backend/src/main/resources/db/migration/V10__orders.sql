-- Orders, their items and their payments (HU-19), see docs/diagrama-de-base-de-datos.md.
-- No ON DELETE CASCADE towards users, addresses or products: they are deactivated or soft deleted, never removed.
CREATE SEQUENCE order_code_seq START 1;

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(12) NOT NULL UNIQUE,
    -- Kept in clear on purpose: the customer must be able to see it again to tell it to the courier
    delivery_code VARCHAR(4) NOT NULL CHECK (delivery_code ~ '^[0-9]{4}$'),
    user_id BIGINT NOT NULL REFERENCES users (id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDIENTE_PAGO', 'PAGADO', 'CANCELADO')),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('ONLINE', 'CONTRAENTREGA')),
    delivery_type VARCHAR(10) NOT NULL CHECK (delivery_type IN ('ENTREGA', 'RECOJO')),
    address_id BIGINT REFERENCES addresses (id),
    address_label VARCHAR(40),
    address_text VARCHAR(200),
    address_reference VARCHAR(200),
    address_latitude NUMERIC(9, 6),
    address_longitude NUMERIC(9, 6),
    delivery_zone_name VARCHAR(60),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    delivery_price NUMERIC(10, 2) NOT NULL CHECK (delivery_price >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    expires_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason VARCHAR(30),
    preference_id VARCHAR(100),
    init_point VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((delivery_type = 'ENTREGA') = (address_text IS NOT NULL))
);

CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_pending_expiry ON orders (expires_at) WHERE status = 'PENDIENTE_PAGO';

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products (id),
    product_name VARCHAR(150) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders (id),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('MERCADOPAGO')),
    provider_payment_id VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL,
    status_detail VARCHAR(100),
    amount NUMERIC(10, 2) NOT NULL,
    needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payments_provider_payment UNIQUE (provider, provider_payment_id)
);

CREATE INDEX idx_payments_order_id ON payments (order_id);
