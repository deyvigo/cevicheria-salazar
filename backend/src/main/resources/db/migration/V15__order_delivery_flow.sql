-- Full delivery flow (HU-26). Existing rows keep EN_PREPARACION / EN_CAMINO / ENTREGADO, all still valid.
ALTER TABLE orders DROP CONSTRAINT orders_delivery_status_check;

ALTER TABLE orders
    ADD CONSTRAINT orders_delivery_status_check CHECK (delivery_status IN (
        'PENDIENTE', 'CONFIRMADO', 'EN_PREPARACION', 'LISTO_PARA_RECOGER', 'LISTO_PARA_ENVIO',
        'EN_CAMINO', 'ENTREGADO', 'RECHAZADO', 'CANCELADO', 'FALLIDO')),
    ALTER COLUMN delivery_status SET DEFAULT 'PENDIENTE',
    ADD COLUMN delivery_reason VARCHAR(200),
    ADD COLUMN delivery_updated_at TIMESTAMPTZ,
    ADD COLUMN refund_status VARCHAR(12) CHECK (refund_status IN ('PENDIENTE', 'REEMBOLSADO')),
    ADD COLUMN refunded_at TIMESTAMPTZ;
