CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE
);

CREATE UNIQUE INDEX uq_categories_name_lower ON categories (lower(name));

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category_id BIGINT NOT NULL REFERENCES categories (id),
    rating NUMERIC(2, 1) CHECK (rating >= 0 AND rating <= 5),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category_active_name ON products (category_id, is_active, name);

CREATE TABLE product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    path VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON product_images (product_id, position);

INSERT INTO categories (name, slug) VALUES
    ('Entradas', 'entradas'),
    ('Ceviches', 'ceviches'),
    ('Chicharrones', 'chicharrones'),
    ('Fondos', 'fondos'),
    ('Bebidas', 'bebidas');
