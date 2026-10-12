ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0);

-- Dishes that already exist must stay orderable after the migration; new rows start at 0 until an admin sets them
UPDATE products SET stock = 20;
