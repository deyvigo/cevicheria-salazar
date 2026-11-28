Página de inicio (`/`):

- **Hero** (HU-45): fotos de ceviche en carrusel con el título y el enlace a la carta fijos encima.
- **Los favoritos de la casa** (HU-46): bento de 5 platos de `GET /api/products/featured`. Primero los más vendidos de los últimos 30 días (solo pedidos pagados, como Reportes) (con la etiqueta "Más vendido"); las casillas que faltan se completan con los mejor calificados y luego los más recientes. Solo entran platos que se pueden pedir, y la sección no se muestra si hay menos de 3.

## Fotos del hero

Viven en `frontend/public/hero/` como `hero-N-1200.webp` y `hero-N-2000.webp` (WebP, calidad 72). Para cambiarlas basta reemplazar esos archivos con el mismo nombre y tamaño aproximado; el orden es el de `hero-slides.ts`.

Todas son de [Unsplash](https://unsplash.com) bajo la [licencia de Unsplash](https://unsplash.com/license): uso comercial gratuito, sin atribución obligatoria.

| Archivo  | Foto                                                         | Autor                                                          |
| -------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| `hero-1` | [Ceviche peruano](https://unsplash.com/photos/YmC1_EP6TJQ)   | [Pirata Studio Film](https://unsplash.com/@piratastudiofilm)   |
| `hero-2` | [Ceviche de pescado](https://unsplash.com/photos/7YXOqZDhhG0) | [Silvia Trigo](https://unsplash.com/@silvinhatrigo)            |
| `hero-3` | [Ceviche de camarones](https://unsplash.com/photos/mFmI0dHyF7k) | [Yasmine Duchesne](https://unsplash.com/@y_duchesne)        |
