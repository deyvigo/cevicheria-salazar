# Spec: HU-09 — Buscar platos por nombre

**Épica**: [E2. Catálogo de productos](../../docs/epicas.md#e2)
**Estado**: Hecha

## Objetivo

Que un Visitante o Cliente encuentre un plato escribiendo parte de su nombre, sin recorrer categoría por categoría. El buscador vive en el header de la app y, al buscar, el catálogo se reduce a los platos que coinciden y a las categorías donde aparecen.

## Contexto (qué ya existe y qué falta)

HU-07 dejó la pantalla del catálogo (`/{category}`): categorías a la izquierda, grilla de platos paginada y ordenable a la derecha. Hoy esa pantalla siempre muestra los platos de **una** categoría y `/` redirige a la primera. HU-07 anticipó que esta pantalla se reutilizaría para los resultados de una búsqueda, por lo que el listado, la paginación y el orden se mantienen tal cual.

Para buscar tiene sentido poder ver todo el catálogo a la vez, así que esta historia agrega dos conceptos:

- Una opción **"Todos"** en la lista de categorías, que muestra los platos de todas las categorías y pasa a ser la vista por defecto (reemplaza la redirección de `/` a la primera categoría).
- El **término de búsqueda**, que filtra tanto la grilla como la lista de categorías.

Sin término de búsqueda y con "Todos" seleccionado, la pantalla es la del catálogo completo sin ningún filtro.

## Actor(es)

Visitante y Cliente. La búsqueda es pública: no requiere iniciar sesión.

## Pantalla

### Buscador en el header

- Un campo de texto con un botón de lupa, ubicado en el **centro** del header, entre el nombre "Salazar SAC" (izquierda) y el botón de sesión o menú de usuario (derecha).
- Está en el header de toda la app, de modo que se puede buscar desde el catálogo, el detalle de un plato o cualquier otra pantalla que use el header.
- Placeholder: "Buscar platos". El botón de lupa tiene nombre accesible "Buscar".
- **La búsqueda solo se ejecuta al hacer clic en la lupa o al presionar Enter** dentro del campo. Escribir no dispara ninguna búsqueda ni modifica la pantalla.
- Cuando hay una búsqueda activa, el campo muestra el término buscado (también tras recargar o abrir un enlace compartido).

### Lista de categorías

- La primera opción es **"Todos"**, enlace a `/`. Es la opción resaltada por defecto.
- Debajo, las categorías de HU-07, cada una enlace a `/{slug}`.
- Con una búsqueda activa, la lista muestra "Todos" y solo las categorías que tienen al menos un plato que coincide.

### Área principal

- Igual que HU-07: encabezado "Mostrando 1-18 de N elementos", selector "Ordenar por", grilla de tarjetas y paginación.
- Con "Todos", la grilla incluye los platos de todas las categorías; el orden y la paginación se aplican al conjunto completo.
- Con una búsqueda activa, N cuenta solo los platos que coinciden dentro de la opción resaltada ("Todos" o una categoría).

### Rutas

| URL                       | Qué muestra                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `/`                       | "Todos", sin filtro.                                          |
| `/?q=ceviche`             | "Todos", platos cuyo nombre coincide con "ceviche".           |
| `/{category}`             | Una categoría, sin filtro.                                    |
| `/{category}?q=ceviche`   | Una categoría, platos que coinciden.                          |

`page` y `sort` siguen las reglas de HU-07 y pueden acompañar a cualquiera de las anteriores.

## Criterios de aceptación

- **Dado** que abro `/`, **cuando** carga, **entonces** veo "Todos" resaltado en la lista de categorías y la grilla con los platos activos de todas las categorías; ya no me redirige a la primera categoría.
- **Dado** que veo "Todos", **cuando** elijo una categoría, **entonces** la URL pasa a `/{slug}` y veo solo sus platos; **y cuando** elijo "Todos", vuelvo a `/`.
- **Dado** que escribo "ceviche" en el buscador, **cuando** aún no hago clic en la lupa ni presiono Enter, **entonces** la pantalla no cambia.
- **Dado** que escribí un término, **cuando** presiono Enter o hago clic en la lupa, **entonces** la URL pasa a `/?q=ceviche`, "Todos" queda resaltado y veo todos los platos cuyo nombre coincide.
- **Dado** que hay una búsqueda activa, **cuando** miro la columna izquierda, **entonces** veo "Todos" y solo las categorías con al menos un plato que coincide.
- **Dado** que hay una búsqueda activa, **cuando** elijo una categoría de la lista, **entonces** la URL pasa a `/{slug}?q=ceviche`: el término se conserva, la página vuelve a 1 y el orden vuelve al por defecto (como en HU-07).
- **Dado** que hay una búsqueda activa, **cuando** cambio de página o de orden, **entonces** el término se conserva en la URL y se aplica a todo el conjunto, no solo a la página visible.
- **Dado** que busco desde una categoría (`/ceviches`), **cuando** se ejecuta la búsqueda, **entonces** la URL pasa a `/?q=...` con "Todos" resaltado; la categoría anterior no se conserva.
- **Dado** que busco "CEVICHE", "ceviché" o "  ceviche ", **cuando** se ejecuta, **entonces** obtengo los mismos resultados que con "ceviche": no distingue mayúsculas ni tildes e ignora espacios al inicio y al final.
- **Dado** que busco "mixto", **cuando** se ejecuta, **entonces** aparecen los platos cuyo nombre contiene "mixto" en cualquier posición (por ejemplo "Ceviche mixto" y "Chicharrón mixto"), no solo los que empiezan con él.
- **Dado** que hay una búsqueda activa, **cuando** envío el campo vacío (o solo espacios) con Enter o la lupa, **entonces** se quita el filtro y vuelvo a `/` (sin filtro, "Todos").
- **Dado** que busco un término sin coincidencias (por ejemplo "pizza"), **cuando** se ejecuta, **entonces** veo el mensaje "No se encontraron productos" y la lista de categorías solo con "Todos".
- **Dado** que un plato está inactivo (`active = false`), **cuando** busco su nombre o veo "Todos", **entonces** no aparece ni cuenta en el total.
- **Dado** que un plato está agotado (`available = false`), **cuando** busco su nombre o veo "Todos", **entonces** aparece como en el catálogo (agotado no es inactivo).
- **Dado** que abro un enlace con `?q=...`, **cuando** carga, **entonces** veo los mismos resultados y el campo con el término, sin tener que volver a buscar.
- **Dado** que estoy en el detalle de un plato, **cuando** busco desde el header, **entonces** navego a `/?q=...` con los resultados.
- **Dado** que no he iniciado sesión, **cuando** busco o veo "Todos", **entonces** obtengo los mismos resultados (endpoints públicos).

## Casos borde

- Término muy largo: se limita a 100 caracteres; más allá se recorta, sin error.
- Caracteres especiales del patrón de búsqueda (`%`, `_`, `\`): se tratan como texto literal, no como comodines.
- Término en la URL con solo espacios (`?q=%20`): equivale a no tener búsqueda.
- `/{category}?q=...` con una categoría que no tiene coincidencias: se muestra "No se encontraron productos" y, como en HU-07, no hay pantalla de error ni redirección; la lista de categorías sigue filtrada.
- Página fuera de rango y `sort` desconocido siguen las reglas de HU-07.
- El orden en "Todos" desempata por nombre y luego por `id`, igual que en HU-07, para que la paginación sea estable.
- `todos` no puede ser el `slug` de una categoría: `/todos` no es la ruta de "Todos" (esa es `/`), pero se reserva el nombre para evitar confusión.
- El término se compara solo contra el **nombre** del plato; no contra la descripción ni la categoría.
- El aviso "Cerraste sesión" que hoy sobrevive a la redirección de `/` (HU-05) debe seguir mostrándose, ahora que `/` ya no redirige.

## Impacto en HU-07

Esta historia cambia comportamiento ya entregado, por lo que `specs/hu-07-ver-platos-por-categoria/spec.md` debe actualizarse en el mismo cambio:

- `/` deja de redirigir a la primera categoría y pasa a mostrar "Todos".
- La lista de categorías gana la opción "Todos".
- `GET /api/products` deja de exigir `category` (sin ella devuelve todos los platos activos).
- La frase "esta pantalla se reutilizará para HU-09, pero aquí no hay buscador" queda cumplida.

## Fuera de alcance

- Búsqueda en descripción, por categoría o por precio; autocompletado, sugerencias, historial o resaltado del texto coincidente.
- Búsqueda tolerante a errores de escritura (fuzzy) o por sinónimos.
- Buscar mientras se escribe (por diseño, solo clic en la lupa o Enter).
- Botón para limpiar el campo ("x"): se limpia vaciándolo y presionando Enter.
- Conteos por categoría en la lista filtrada.
- Layout del buscador para celular: HU-07 cubre solo escritorio y se define en una iteración posterior.
- Caché en Redis de las búsquedas (el catálogo aún no cachea; ver HU-07).
- Búsqueda en el panel `/admin` (HU-29).

## Decisiones de clarificación

- **Vista sin filtro**: opción "Todos" en la lista de categorías, vista por defecto en `/`. Reemplaza la redirección a la primera categoría de HU-07.
- **Al buscar**: se resalta "Todos" y el usuario elige después la categoría que quiera entre las que tienen coincidencias.
- **Limpiar la búsqueda**: enviar el campo vacío; sin botón "x".
- **Conteos por categoría**: no.
- **Mensaje sin resultados**: el mismo "No se encontraron productos" de HU-07.
- **Parámetro de URL**: `q`, en inglés como el resto de parámetros.
