-- Cash on delivery detail (HU-20): how the customer will pay on arrival and, for cash, with how much.
-- The change is not stored: it is cash_amount - total, both immutable.
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
        CHECK (status IN ('PENDIENTE_PAGO', 'PENDIENTE_COBRO', 'PAGADO', 'CANCELADO'));

ALTER TABLE orders ADD COLUMN collection_method VARCHAR(10) CHECK (collection_method IN ('EFECTIVO', 'YAPE'));
ALTER TABLE orders ADD COLUMN cash_amount NUMERIC(10, 2) CHECK (cash_amount > 0);

ALTER TABLE orders
    ADD CONSTRAINT orders_collection_matches_payment_method
        CHECK ((payment_method = 'CONTRAENTREGA') = (collection_method IS NOT NULL));
ALTER TABLE orders
    ADD CONSTRAINT orders_cash_amount_only_for_cash
        CHECK (cash_amount IS NULL OR collection_method = 'EFECTIVO');
ALTER TABLE orders
    ADD CONSTRAINT orders_cash_amount_covers_total
        CHECK (cash_amount IS NULL OR cash_amount >= total);
