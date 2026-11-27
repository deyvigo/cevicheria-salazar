CREATE TABLE coupons (
    id                    BIGSERIAL PRIMARY KEY,
    code                  VARCHAR(30)   NOT NULL UNIQUE CHECK (code = upper(code) AND code = btrim(code) AND code <> ''),
    discount_type         VARCHAR(10)   NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_value        NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    min_subtotal          NUMERIC(10,2) CHECK (min_subtotal > 0),
    starts_at             TIMESTAMPTZ,
    ends_at               TIMESTAMPTZ,
    max_uses              INTEGER CHECK (max_uses > 0),
    max_uses_per_customer INTEGER CHECK (max_uses_per_customer > 0),
    is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CHECK (discount_type <> 'PERCENTAGE' OR discount_value <= 100),
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
);

ALTER TABLE orders
    ADD COLUMN coupon_id   BIGINT REFERENCES coupons (id),
    ADD COLUMN coupon_code VARCHAR(30),
    ADD CONSTRAINT orders_coupon_copy CHECK ((coupon_id IS NULL) = (coupon_code IS NULL));

-- Only orders still alive count as a use: an unpaid online order that expires or is replaced gives its use back
CREATE INDEX idx_orders_coupon_usage ON orders (coupon_id, user_id)
    WHERE coupon_id IS NOT NULL AND status IN ('PENDIENTE_PAGO', 'PENDIENTE_COBRO', 'PAGADO');
