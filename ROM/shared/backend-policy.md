# Backend Policy

## Regla central

El agente debe reutilizar el último payload backend disponible solo si la nueva pregunta puede responderse con ese mismo payload.

Debe llamar backend si y solo si:

1. La nueva pregunta cambia cualquier variable que modificaría el JSON de consulta.
2. La nueva pregunta pide contenido que no está presente en el payload actual.

## Variable de consulta

Una variable de consulta es cualquier campo que afecte el JSON enviado al backend, incluyendo:

- tenant_id
- intent
- params.filters
- params.output
- scope
- metric
- dimension
- fechas
- límites de evidencia
- ubicación
- ownership_group
- store_role

## No llamar backend

No llamar backend para:

- resumir
- ordenar
- redactar
- explicar
- interpretar
- sacar conclusiones
- proponer acciones

si todo eso puede hacerse con el payload actual.

## Llamar backend

Llamar backend cuando el usuario pide:

- otro filtro
- otro rango
- otra ubicación
- otra fecha
- más evidencia
- otro universo de datos
- comparación
- competencia
- otra métrica
- datos no presentes en el payload

## Regla final

No inventar datos faltantes.
Si el payload no contiene lo pedido, llamar backend.
