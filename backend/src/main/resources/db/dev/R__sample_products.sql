-- Dev-only sample catalog; loaded through `spring.flyway.locations` in application-dev.yml and idempotent by product name.
INSERT INTO products (name, description, price, category_id, rating, is_active)
SELECT v.name, v.description, v.price, c.id, v.rating, v.is_active
FROM (VALUES
        ('Ceviche clásico', 'Ceviche clásico, preparado al momento con insumos frescos.', 22.00, 'ceviches', 4.0, true),
        ('Ceviche mixto', 'Ceviche mixto, preparado al momento con insumos frescos.', 25.00, 'ceviches', 4.8, true),
        ('Ceviche de pescado', 'Ceviche de pescado, preparado al momento con insumos frescos.', 8.00, 'ceviches', 3.5, true),
        ('Ceviche de conchas negras', 'Ceviche de conchas negras, preparado al momento con insumos frescos.', 32.00, 'ceviches', 3.5, true),
        ('Ceviche de camarón', 'Ceviche de camarón, preparado al momento con insumos frescos.', 22.00, 'ceviches', 4.7, true),
        ('Ceviche de pulpo', 'Ceviche de pulpo, preparado al momento con insumos frescos.', 8.00, 'ceviches', 4.7, true),
        ('Ceviche de lenguado', 'Ceviche de lenguado, preparado al momento con insumos frescos.', 15.00, 'ceviches', 3.5, true),
        ('Ceviche de corvina', 'Ceviche de corvina, preparado al momento con insumos frescos.', 10.00, 'ceviches', 4.5, true),
        ('Ceviche de pota', 'Ceviche de pota, preparado al momento con insumos frescos.', 25.00, 'ceviches', NULL, true),
        ('Ceviche carretillero', 'Ceviche carretillero, preparado al momento con insumos frescos.', 10.00, 'ceviches', 4.0, true),
        ('Ceviche a lo macho', 'Ceviche a lo macho, preparado al momento con insumos frescos.', 10.00, 'ceviches', 4.7, true),
        ('Ceviche de atún', 'Ceviche de atún, preparado al momento con insumos frescos.', 25.00, 'ceviches', 3.5, true),
        ('Ceviche de mero', 'Ceviche de mero, preparado al momento con insumos frescos.', 35.00, 'ceviches', 3.5, true),
        ('Ceviche de cabrilla', 'Ceviche de cabrilla, preparado al momento con insumos frescos.', 15.00, 'ceviches', 4.8, true),
        ('Ceviche de tollo', 'Ceviche de tollo, preparado al momento con insumos frescos.', 38.00, 'ceviches', 4.7, true),
        ('Ceviche de cangrejo', 'Ceviche de cangrejo, preparado al momento con insumos frescos.', 8.00, 'ceviches', 4.7, true),
        ('Ceviche de langostinos', 'Ceviche de langostinos, preparado al momento con insumos frescos.', 35.00, 'ceviches', 4.5, true),
        ('Ceviche de erizo', 'Ceviche de erizo, preparado al momento con insumos frescos.', 8.00, 'ceviches', NULL, true),
        ('Ceviche del chef', 'Ceviche del chef, preparado al momento con insumos frescos.', 15.00, 'ceviches', 3.5, true),
        ('Ceviche nikkei', 'Ceviche nikkei, preparado al momento con insumos frescos.', 32.00, 'ceviches', 5.0, true),
        ('Ceviche de leche de tigre', 'Ceviche de leche de tigre, preparado al momento con insumos frescos.', 12.00, 'ceviches', 4.2, true),
        ('Ceviche en salsa de rocoto', 'Ceviche en salsa de rocoto, preparado al momento con insumos frescos.', 25.00, 'ceviches', 4.0, true),
        ('Ceviche de jalea', 'Ceviche de jalea, preparado al momento con insumos frescos.', 32.00, 'ceviches', 3.5, true),
        ('Ceviche de trucha', 'Ceviche de trucha, preparado al momento con insumos frescos.', 35.00, 'ceviches', 4.2, true),
        ('Leche de tigre', 'Leche de tigre, preparado al momento con insumos frescos.', 32.00, 'entradas', 5.0, true),
        ('Causa limeña', 'Causa limeña, preparado al momento con insumos frescos.', 38.00, 'entradas', 4.0, true),
        ('Choritos a la chalaca', 'Choritos a la chalaca, preparado al momento con insumos frescos.', 10.00, 'entradas', 4.7, true),
        ('Tiradito clásico', 'Tiradito clásico, preparado al momento con insumos frescos.', 35.00, 'entradas', 4.8, true),
        ('Pulpo al olivo', 'Pulpo al olivo, preparado al momento con insumos frescos.', 15.00, 'entradas', 4.2, true),
        ('Ocopa arequipeña', 'Ocopa arequipeña, preparado al momento con insumos frescos.', 10.00, 'entradas', 4.7, true),
        ('Papa a la huancaína', 'Papa a la huancaína, preparado al momento con insumos frescos.', 42.00, 'entradas', 3.5, true),
        ('Anticuchos de corazón', 'Anticuchos de corazón, preparado al momento con insumos frescos.', 35.00, 'entradas', 3.5, true),
        ('Chicharrón de pescado', 'Chicharrón de pescado, preparado al momento con insumos frescos.', 35.00, 'chicharrones', 4.0, true),
        ('Chicharrón de calamar', 'Chicharrón de calamar, preparado al momento con insumos frescos.', 28.00, 'chicharrones', 4.8, true),
        ('Chicharrón de pota', 'Chicharrón de pota, preparado al momento con insumos frescos.', 32.00, 'chicharrones', 4.5, true),
        ('Chicharrón mixto', 'Chicharrón mixto, preparado al momento con insumos frescos.', 22.00, 'chicharrones', 4.5, true),
        ('Chicharrón de pollo', 'Chicharrón de pollo, preparado al momento con insumos frescos.', 35.00, 'chicharrones', 4.5, true),
        ('Jalea mixta', 'Jalea mixta, preparado al momento con insumos frescos.', 22.00, 'chicharrones', 4.2, true),
        ('Arroz con mariscos', 'Arroz con mariscos, preparado al momento con insumos frescos.', 15.00, 'fondos', 5.0, true),
        ('Tacu tacu con mariscos', 'Tacu tacu con mariscos, preparado al momento con insumos frescos.', 12.00, 'fondos', 4.8, true),
        ('Sudado de pescado', 'Sudado de pescado, preparado al momento con insumos frescos.', 15.00, 'fondos', 3.5, true),
        ('Parihuela', 'Parihuela, preparado al momento con insumos frescos.', 35.00, 'fondos', 4.2, true),
        ('Chaufa de mariscos', 'Chaufa de mariscos, preparado al momento con insumos frescos.', 32.00, 'fondos', 4.5, true),
        ('Chicha morada', 'Chicha morada, preparado al momento con insumos frescos.', 22.00, 'bebidas', 4.8, true),
        ('Limonada frozen', 'Limonada frozen, preparado al momento con insumos frescos.', 28.00, 'bebidas', 4.2, true),
        ('Inca Kola 500 ml', 'Inca Kola 500 ml, preparado al momento con insumos frescos.', 35.00, 'bebidas', 3.5, true),
        ('Cerveza artesanal', 'Cerveza artesanal, preparado al momento con insumos frescos.', 10.00, 'bebidas', 4.7, true),
        ('Plato sin foto', 'Plato de prueba sin imágenes.', 20.00, 'fondos', NULL, true),
        ('Plato retirado', 'Plato inactivo, no debe aparecer en la carta.', 20.00, 'ceviches', 4.0, false)
     ) AS v (name, description, price, category_slug, rating, is_active)
JOIN categories c ON c.slug = v.category_slug
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name);

INSERT INTO product_images (product_id, path, position)
SELECT p.id, 'seed/' || regexp_replace(lower(p.name), '[^a-z0-9]+', '-', 'g') || '.jpg', 0
FROM products p
WHERE p.name <> 'Plato sin foto'
  AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.id);

UPDATE product_images SET path = replace(path, 'platos/', 'seed/') WHERE path LIKE 'platos/%';
