# Cronograma — App e-commerce Salazar SAC

Duración de cada sprint: 3 semanas (lunes a viernes). Historias en [historias.md](historias.md).

## Vista general

| Sprint   | Inicio     | Fin        | Objetivo                                                    |
| -------- | ---------- | ---------- | ----------------------------------------------------------- |
| Sprint 0 | 07/09/2026 | 25/09/2026 | Documentación inicial, diagramas, entorno, registro y login |
| Sprint 1 | 28/09/2026 | 16/10/2026 | Catálogo de productos y carrito de compras                  |
| Sprint 2 | 19/10/2026 | 06/11/2026 | Por definir en su Sprint Planning                           |
| Sprint 3 | 09/11/2026 | 27/11/2026 | Por definir en su Sprint Planning                           |

---

## Sprint 0 (07/09/2026 – 25/09/2026)

**Objetivo del sprint:** contar con el alcance validado, los diagramas base del sistema, el entorno de desarrollo listo y el registro e inicio de sesión funcionando.

### Elementos del backlog incluidos

| ID    | Elemento                                              | Tipo    | Semana |
| ----- | ----------------------------------------------------- | ------- | ------ |
| HT-01 | Documento de visión y alcance                         | Técnica | 1      |
| HT-02 | Levantamiento y validación de requerimientos          | Técnica | 1      |
| HT-03 | Product Backlog inicial, DoR y DoD                    | Técnica | 1      |
| HT-04 | Diagrama de casos de uso                              | Técnica | 2      |
| HT-05 | Diagrama de arquitectura                              | Técnica | 2      |
| HT-06 | Modelo de base de datos                               | Técnica | 2      |
| HT-07 | Diagrama de despliegue                                | Técnica | 2      |
| HT-08 | Prototipos de pantallas                               | Técnica | 3      |
| HT-09 | Configuración del entorno                             | Técnica | 3      |
| HU-01 | Registrarse con correo, nombre, teléfono y contraseña | Usuario | 3      |
| HU-02 | Iniciar sesión con correo y contraseña                | Usuario | 3      |

### Distribución por semana

| Semana | Fechas        | Enfoque                               | Elementos                  |
| ------ | ------------- | ------------------------------------- | -------------------------- |
| 1      | 07/09 – 11/09 | Documentación inicial                 | HT-01, HT-02, HT-03        |
| 2      | 14/09 – 18/09 | Diagramas                             | HT-04, HT-05, HT-06, HT-07 |
| 3      | 21/09 – 25/09 | Prototipos, entorno, registro y login | HT-08, HT-09, HU-01, HU-02 |

### Eventos Scrum

| Evento               | Fecha              |
| -------------------- | ------------------ |
| Sprint Planning      | 07/09/2026         |
| Daily Scrum          | Diario, 15 minutos |
| Sprint Review        | 25/09/2026         |
| Sprint Retrospective | 25/09/2026         |

### Entregables al cierre

- Documento de visión y alcance
- Backlog priorizado con DoR y DoD
- Diagramas de casos de uso, arquitectura, base de datos y despliegue
- Prototipos de pantallas
- Repositorio configurado con el proyecto base
- Registro funcional (HU-01)
- Login funcional (HU-02)

---

## Sprint 1 (28/09/2026 – 16/10/2026)

**Objetivo del sprint:** cerrar lo que falta de autenticación (Google, mantener sesión, cerrar sesión y recuperar contraseña), y que el Cliente/Visitante pueda ver la carta organizada por categorías, buscar y revisar el detalle de cada plato, y armar su pedido en un carrito que se conserve sin necesidad de cuenta.

### Elementos del backlog incluidos

| ID    | Elemento                                                       | Tipo    | Prioridad | Semana |
| ----- | --------------------------------------------------------------- | ------- | --------- | ------ |
| HU-06 | Registrarse o iniciar sesión con Google                         | Usuario | Baja      | 1      |
| HU-04 | Mantener la sesión iniciada                                     | Usuario | Media     | 1      |
| HU-05 | Cerrar sesión                                                    | Usuario | Media     | 1      |
| HU-03 | Recuperar contraseña por correo                                  | Usuario | Media     | 1      |
| HU-07 | Ver platos organizados por categorías                           | Usuario | Alta      | 1      |
| HT-10 | Almacenamiento de imágenes (Garage y SDK de AWS S3)              | Técnica | Alta      | 2      |
| HU-08 | Ver detalle de un plato (foto, descripción, precio)              | Usuario | Alta      | 2      |
| HU-10 | Saber si un plato está agotado o no disponible                  | Usuario | Alta      | 2      |
| HU-09 | Buscar platos por nombre                                         | Usuario | Media     | 2      |
| HU-11 | Ver promociones o platos destacados                              | Usuario | Baja      | 2      |
| HU-12 | Agregar platos al carrito                                        | Usuario | Alta      | 2      |
| HU-13 | Modificar cantidad o eliminar platos del carrito                 | Usuario | Alta      | 3      |
| HU-14 | Ver subtotal, costo de delivery y total                         | Usuario | Alta      | 3      |
| HU-16 | Conservar el carrito aunque cierre la app sin iniciar sesión     | Usuario | Alta      | 3      |
| HU-35 | Conservar el carrito al iniciar sesión o registrarse             | Usuario | Alta      | 3      |
| HU-15 | Agregar una nota a un plato                                     | Usuario | Media     | 3      |

### Distribución por semana

| Semana | Fechas        | Enfoque                                                        | Elementos                               |
| ------ | ------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| 1      | 28/09 – 02/10 | Cierre de autenticación (Google, sesión, contraseña); inicio del catálogo | HU-06, HU-04, HU-05, HU-03, HU-07 |
| 2      | 05/10 – 09/10 | Almacenamiento de imágenes; catálogo: detalle, disponibilidad, búsqueda y destacados; inicio del carrito | HT-10, HU-08, HU-10, HU-09, HU-11, HU-12 |
| 3      | 12/10 – 16/10 | Carrito: cantidades, totales, persistencia y notas                 | HU-13, HU-14, HU-16, HU-35, HU-15 |

### Eventos Scrum

| Evento               | Fecha              |
| --------------------- | ------------------ |
| Sprint Planning       | 28/09/2026         |
| Daily Scrum           | Diario, 15 minutos |
| Sprint Review         | 16/10/2026         |
| Sprint Retrospective  | 16/10/2026         |

### Entregables al cierre

- Épica E1 completa: login con Google, mantener sesión, cerrar sesión y recuperar contraseña (HU-03 a HU-06)
- Catálogo de productos navegable por categorías, con detalle, búsqueda, disponibilidad y destacados (HU-07 a HU-11)
- Carrito de compras funcional sin necesidad de cuenta, con notas, totales y persistencia al iniciar sesión o registrarse (HU-12 a HU-16, HU-35)
