-- Cash on delivery is paid on delivery, so its purchase date is created_at and never moves; only online orders use paid_at
DROP INDEX idx_orders_admin_purchased;
DROP INDEX idx_orders_user_purchased;

CREATE INDEX idx_orders_admin_purchased ON orders (
    (CASE WHEN payment_method = 'CONTRAENTREGA' THEN created_at ELSE COALESCE(paid_at, created_at) END) DESC, id DESC)
    WHERE status IN ('PAGADO', 'PENDIENTE_COBRO');

CREATE INDEX idx_orders_user_purchased ON orders (
    user_id, (CASE WHEN payment_method = 'CONTRAENTREGA' THEN created_at ELSE COALESCE(paid_at, created_at) END) DESC, id DESC)
    WHERE status IN ('PAGADO', 'PENDIENTE_COBRO');
