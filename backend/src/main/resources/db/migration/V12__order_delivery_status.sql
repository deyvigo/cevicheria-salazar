-- Delivery stage of a purchased order (HU-25); independent from status, which only tracks payment.
ALTER TABLE orders
    ADD COLUMN delivery_status VARCHAR(20) NOT NULL DEFAULT 'EN_PREPARACION'
        CHECK (delivery_status IN ('EN_PREPARACION', 'EN_CAMINO', 'ENTREGADO'));

CREATE INDEX idx_orders_user_purchased ON orders (user_id, (COALESCE(paid_at, created_at)) DESC, id DESC)
    WHERE status IN ('PAGADO', 'PENDIENTE_COBRO');
