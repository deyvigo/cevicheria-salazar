# Specs (Spec-Driven Development)

Antes de implementar una historia de usuario o técnica, se escribe su especificación aquí. El código se revisa contra la spec, no al revés.

## Flujo

1. **Especificar** — `spec.md`: qué se construye y por qué, sin hablar de tecnología. Objetivo, actores y criterios de aceptación en formato *Dado / Cuando / Entonces*.
2. **Clarificar** — resolver las preguntas abiertas de la spec con el usuario antes de pasar al siguiente paso.
3. **Planificar** — `plan.md`: el cómo. Endpoints, cambios de base de datos, capas de Spring involucradas, pantallas y componentes del `design-system/` a usar.
4. **Dividir en tareas** — `tasks.md`: checklist pequeña y ordenada; cada tarea indica qué criterios de aceptación cubre y cómo se verifica.
5. **Implementar** — una tarea a la vez, con tests que comprueben los criterios.
6. **Verificar y cerrar** — repasar cada criterio de la spec. Si algo cambió durante la implementación, actualizar la spec y, si corresponde, el `.md` del diagrama afectado en `docs/`.

## Convención de carpetas

Una carpeta por historia:

```
specs/
  hu-01-registro/
    spec.md
    plan.md
    tasks.md
```

- `hu-XX-nombre-corto/` para historias de usuario (`docs/historias.md`), `ht-XX-nombre-corto/` para historias técnicas (`docs/epicas.md#e0`).
- No se escribe `plan.md` hasta que `spec.md` no tenga preguntas abiertas sin resolver.
- Plantillas en `specs/_plantilla/`.

## Estados de una spec

`spec.md` declara su estado en el encabezado:

- **Borrador**: recién escrita, puede tener preguntas abiertas.
- **Clarificada**: sin preguntas abiertas, lista para planificar.
- **Planificada**: tiene `plan.md` y `tasks.md`.
- **En implementación**: alguna tarea de `tasks.md` está en curso.
- **Hecha**: todos los criterios de aceptación están verificados.
