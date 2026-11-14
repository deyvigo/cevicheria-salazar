-- Set once the confirmation email is claimed, so an order never sends it twice.
ALTER TABLE orders ADD COLUMN confirmation_sent_at TIMESTAMPTZ;
