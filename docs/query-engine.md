# Query Engine

## Endpoint técnico

`POST /api/query/compare`

Estado actual:

- Neon es el motor default.
- Redis queda solo como fallback legacy explícito.
- El uso normal ya no requiere `?engine=neon`.

Uso normal:

`POST /api/query/compare`

Uso legacy/debug:

`POST /api/query/compare?engine=redis`

Respuesta esperada:

- `source = neon_place_daily_metrics`
- `engine = neon`

## Forma de respuesta

El endpoint técnico devuelve salida raw.

La forma `raw | compact` se aplica en:

`POST /api/agent/router`

mediante:

`lib/gmb/responseShape.js`

`shape=compact` ya soporta agregados por:

- `brand`
- `region`
- `market_group`
- `store_role`
- `operator`

## Archivos principales

- `lib/gmb/queryContract.js`
- `lib/gmb/queryExecutorNeon.js` — runtime default Neon
- `lib/gmb/metricsReader.js` — lee `places` + `place_daily_metrics`
- `lib/gmb/queryExecutor.js` — fallback legacy Redis

## Runtime Neon

El motor Neon parte desde:

- `places`
- `place_daily_metrics`

No parte desde índices Redis.

Flujo:

1. normaliza contrato.
2. lee universo desde Neon usando tenant/filtros.
3. une `places` + `place_daily_metrics`.
4. calcula ranking/gap en backend.
5. devuelve JSON raw.

Filtros soportados:

- `tenant_id`
- `industry`
- `location` / `normalized_location`
- `market_group`
- `region`
- `store_role`
- `ownership_group`
- `brand`
- `status=keep`

## Contrato

### scope

- `intra`
- `extra`
- `temporal`

Estado actual:

- ranking/gap usan Neon por default.
- temporal sigue limitado y debe mejorarse sobre `place_daily_metrics`.

### dimension

- `location`
- `brand`
- `operator`
- `store_role`
- `market_group`
- `region`

### metric

- `rating`
- `reviews_count`
- `gap_vs_top`
- `position`
- `delta_rating`
- `delta_reviews_count`
- `delta_gap_vs_top`
- `delta_position`

### filters

- `ownership_group`
- `own_values`
- `store_role`
- `valid_only`
- `location`
- `market_group`
- `region`
- `industry`
- `brand`

## Defaults

Default técnico actual:

- `scope = extra`
- `dimension = location`
- `metric = gap_vs_top`
- `ownership_group = all`
- `store_role = all`
- `valid_only = true`

`output.shape` no pertenece al query engine técnico; pertenece al agent router.

## Validaciones realizadas

Validado con:

- `POST /api/query/compare`
- `POST /api/agent/router`

Casos validados:

- Sodimac por marca.
- Sodimac por región.
- Sodimac por market_group.
- Santiago por marca.
- Santiago gap_vs_top.
- CIDEF por marca.

## Evidencia

El LLM nunca pide keys Redis.

Debe pedir `output.include_evidence = true`.

Estado actual:

- evidencia sigue leyendo Redis.
- métricas/ranking/gap salen de Neon.
- diseño objetivo: `review_map` en Neon para seleccionar review keys y traer texto crudo desde Redis.

## Temporal

Temporal sigue siendo deuda técnica.

Pendiente:

- temporal por brand.
- temporal por operator.
- temporal por store_role.
- temporal por region.
- temporal por market_group.

Objetivo: calcular temporal usando `place_daily_metrics` en Neon.

## delta_position

`delta_position = position_to - position_from`

Interpretación:

- `+2` = empeoró 2 posiciones.
- `-2` = mejoró 2 posiciones.
