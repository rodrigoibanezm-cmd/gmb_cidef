# Operations

## Estado actual

Desde 2026-05-22, la operación de datos quedó separada del runtime.

- `gmb_cidef`: agente/runtime.
- `gmb_cidef_ops`: captura, backfill, indexación y administración de datos.

## Responsabilidad de esta repo

Esta repo mantiene solo el runtime del agente:

- `/api/agent/router`
- `/api/query/compare`
- contratos de consulta
- response shape
- ROM Custom GPT
- documentación del runtime

## Operación movida a `gmb_cidef_ops`

Los siguientes endpoints ya no deben vivir en esta repo:

- `/api/admin/backfill/place-daily-metrics`
- `/api/gmb/index/build`
- `/api/gmb/index/status`
- `/api/gmb/capture/demo-next`
- `/api/gmb/capture/reviews-next`

## Infraestructura compartida

Ambas repos usan la misma infraestructura:

- Neon/Postgres
- Upstash Redis
- Google Places API

## Modelo runtime

- Neon es el plano principal de decisión/runtime.
- `/api/query/compare` usa Neon por default.
- Redis queda como legacy/fallback explícito con `?engine=redis`.
- `/api/agent/router` usa Neon vía `executeCompareQueryNeon`.
- Upstash queda para evidencia cruda e índices legacy.
- Google Places se usa solo desde operaciones/captura.

## Modelo de ubicación

- `normalized_location`: comuna o unidad mínima comparable.
- `market_group`: ciudad o zona mayor.
- `region`: región.

Ejemplo:

- `normalized_location = maipu`
- `market_group = santiago`
- `region = metropolitana`

## Validaciones realizadas

### Sodimac

Backfill ops validado para `2026-05-21`:

- `total_places = 161`
- `inserted = 161`
- `missing = 0`
- `failed = 0`

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

Resultado de gap Santiago:

- `stores_count = 51`
- `owned_count = 23`
- `competitor_count = 28`
- `gap_vs_top = 0.3`

### CIDEF

Backfill ops validado para `2026-05-21`:

- `total_places = 727`
- `inserted = 727`
- `missing = 0`
- `failed = 0`

Runtime Neon validado:

- `tenant_id = cidef`
- `source = neon_place_daily_metrics`
- `engine = neon`
- `row_count > 0`

### Pruebas finales runtime

`POST /api/query/compare` sin `?engine=neon` validado:

- `engine = neon`
- `source = neon_place_daily_metrics`
- `row_count > 0`

`POST /api/agent/router` validado:

- `engine = compare_query_neon`
- `shape = compact`
- `source = neon_place_daily_metrics`
- `row_count > 0`

`shape=compact` fue corregido para agregados. Soporta:

- `brand`
- `region`
- `market_group`
- `store_role`
- `operator`

Y conserva:

- `count`
- `avg_value`
- `best`
- `worst`

## Pendientes reales

1. Limpiar librerías legacy de captura en runtime si no tienen imports activos:
   - `lib/gmb/capturePlacesDemo.js`
   - `lib/gmb/capturePlacesReviews.js`
   - `lib/gmb/placesPostgres.js`
   - `lib/gmb/reviews.js`

2. Limpiar geografía CIDEF:
   - hoy consulta bien por marca/rating.
   - aún necesita `market_group` y `region` consistentes.

3. Agregar backfill por lotes en ops:
   - `limit`
   - `offset`

4. Resolver client config / ownership:
   - no depender de reglas hardcodeadas.
   - preparar multi-tenant real.

5. Temporal avanzado:
   - delta por región.
   - delta por market_group.
   - delta por marca.

## Regla operativa

El agente consulta. Ops mantiene datos. El backend resuelve tenant, filtros, métricas y evidencia.
