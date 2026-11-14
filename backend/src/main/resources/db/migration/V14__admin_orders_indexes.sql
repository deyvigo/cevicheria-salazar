-- Default order of the admin orders table: purchased date, newest first
CREATE INDEX idx_orders_admin_purchased ON orders ((COALESCE(paid_at, created_at)) DESC, id DESC)
    WHERE status IN ('PAGADO', 'PENDIENTE_COBRO');
