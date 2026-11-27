-- Dev-only sample coupons until the admin panel can create them; idempotent by code.
INSERT INTO coupons (code, discount_type, discount_value, min_subtotal, starts_at, ends_at, max_uses, max_uses_per_customer)
VALUES
    ('CEVICHE10', 'PERCENTAGE', 10.00, 30.00, NULL, NULL, NULL, NULL),
    ('BIENVENIDA5', 'FIXED', 5.00, NULL, NULL, NULL, NULL, 1),
    ('VENCIDO', 'PERCENTAGE', 20.00, NULL, '2026-01-01T00:00:00-05:00', '2026-02-01T00:00:00-05:00', NULL, NULL)
ON CONFLICT (code) DO NOTHING;
