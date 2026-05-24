# Query Engine

## Endpoint técnico

`POST /api/query/compare`

Estado actual:

- Neon es el único motor runtime.
- No existe fallback Redis.
- tenant_id es obligatorio.

Respuesta esperada:

- `source = neon_place_daily_metrics`
- `engine = neon`

## Forma de respuesta

El endpoint técnico devuelve salida raw.

La forma `raw | compact` se aplica en:

`POST /api/agent/router`

mediante:

`lib/gmb/responseShape.js`

`shape=compact` soporta agregados por:

- `brand`
- `region`
- `market_group`
- `store_role`
- `operator`

## Archivos principales

- `lib/gmb/queryContract.js`
- `lib/gmb/queryExecutorNeon.js`
- `lib/gmb/metricsReader.js`
- `lib/gmb/evidence.js`

## Runtime Neon

El motor runtime parte desde:

- `places`
- `place_daily_metrics`
- `place_reviews`

Flujo:

1. normaliza contrato.
2. valida tenant.
3. lee universo desde Neon usando tenant/filtros.
4. calcula ranking/gap en backend.
5. adjunta evidencia desde Neon.
6. devuelve JSON raw.

Filtros soportados:

- `tenant_id`
- `industry`
- `location`
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

## Evidencia

El LLM nunca pide keys.

Debe pedir:

```txt
output.include_evidence = true
```

Estado actual:

```txt
evidencia sale desde place_reviews en Neon
```

## Temporal

Temporal sigue siendo deuda técnica.

Pendiente:

- temporal por brand.
- temporal por operator.
- temporal por store_role.
- temporal por region.
- temporal por market_group.

Objetivo:

```txt
calcular temporal usando place_daily_metrics en Neon
```

## delta_position

`delta_position = position_to - position_from`

Interpretación:

- `+2` = empeoró 2 posiciones.
- `-2` = mejoró 2 posiciones.
