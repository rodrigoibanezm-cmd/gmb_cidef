# Operations

## Estado actual

Desde 2026-05-24:

- `gmb_cidef`: runtime/agente.
- `gmb_cidef_ops`: captura y administración operacional.

## Responsabilidad de esta repo

Esta repo mantiene solo el runtime del agente:

- `/api/agent/router`
- `/api/query/compare`
- contratos de consulta
- response shape
- ROM Custom GPT
- documentación runtime

## Operación movida a `gmb_cidef_ops`

Los endpoints operacionales viven en:

```txt
gmb_cidef_ops
```

## Infraestructura runtime

```txt
Neon/Postgres
```

Reglas:

```txt
runtime Neon-only
sin Redis/Upstash
sin Google Places en runtime
tenant_id obligatorio
```

## Modelo runtime

- `/api/query/compare` usa Neon.
- `/api/agent/router` usa Neon vía `executeCompareQueryNeon`.
- evidencia sale desde `place_reviews`.
- cálculo backend es determinístico.

## Modelo de ubicación

- `normalized_location`: comuna o unidad mínima comparable.
- `market_group`: ciudad o zona mayor.
- `region`: región.

## Validaciones realizadas

### Sodimac

Runtime Neon validado:

- `tenant_id = sodimac`
- `source = neon_place_daily_metrics`
- `engine = neon`

Casos probados:

- ranking por marca
- ranking por región
- ranking por market_group
- Santiago completo por marca
- gap de Santiago contra competidores

### CIDEF

Runtime Neon validado:

- `tenant_id = cidef`
- `source = neon_place_daily_metrics`
- `engine = neon`
- `row_count > 0`

### Beauty Plus

Runtime multi-tenant preparado:

- `tenant_id = beauty_plus`
- runtime separado por tenant

## Pendientes reales

1. Temporal avanzado:
   - delta por región.
   - delta por market_group.
   - delta por marca.

2. Resolver client config / ownership:
   - no depender de reglas hardcodeadas.

3. Limpiar librerías runtime muertas:
   - `lib/gmb/keys.js`

## Regla operativa

```txt
El agente consulta.
Ops mantiene datos.
El backend resuelve tenant, filtros, métricas y evidencia.
```
