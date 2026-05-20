# Query Engine

## Endpoint técnico

```txt
POST /api/query/compare
```

Este endpoint soporta dos motores:

```txt
engine=redis  -> motor legacy basado en índices Upstash
engine=neon   -> motor nuevo basado en Neon place_daily_metrics
```

Uso recomendado actual:

```txt
POST /api/query/compare?engine=neon
```

Respuesta esperada:

```txt
source = neon_place_daily_metrics
engine = neon
```

## Forma de respuesta

El endpoint técnico devuelve salida raw.

La forma `raw | compact` se aplica en:

```txt
POST /api/agent/router
```

mediante:

```txt
lib/gmb/responseShape.js
```

## Archivos principales

```txt
lib/gmb/queryContract.js
lib/gmb/queryExecutor.js        legacy Redis indexes
lib/gmb/queryExecutorNeon.js    Neon metrics runtime
lib/gmb/metricsReader.js        lector places + place_daily_metrics
```

## Runtime Neon

El motor Neon parte desde:

```txt
places
place_daily_metrics
```

No parte desde:

```txt
gmb:index:{date}:locations
```

Flujo:

```txt
1. normaliza contrato
2. lee universo desde Neon usando tenant/filtros
3. une places + place_daily_metrics
4. calcula ranking/gap en backend
5. devuelve JSON raw
```

Filtros soportados en Neon:

```txt
tenant_id
industry
normalized_location / location
store_role
ownership_group
brand
status=keep
```

## Contrato

### scope

```txt
intra
extra
temporal
```

Nota actual:

```txt
queryExecutorNeon soporta metrics para extra/intra.
temporal debe validarse antes de moverlo a Neon como default.
```

### dimension

```txt
location
brand
operator
store_role
```

### metric

```txt
rating
reviews_count
gap_vs_top
position
delta_rating
delta_reviews_count
delta_gap_vs_top
delta_position
```

### filters

```txt
ownership_group: own | competitor | all
own_values: string[]
store_role: valor flexible por industria | all
valid_only: boolean
location: string | null
industry: string | null
brand: string | null
```

`filters.location` es opcional.

Uso:

```json
{
  "filters": {
    "location": "antofagasta"
  }
}
```

Normalización esperada:

```txt
trim
lowercase
espacios -> _
```

### sort

```txt
asc
desc
```

## Defaults

```json
{
  "scope": "extra",
  "dimension": "location",
  "metric": "gap_vs_top",
  "filters": {
    "ownership_group": "all",
    "own_values": ["own"],
    "store_role": "dealer",
    "valid_only": true,
    "location": null
  },
  "output": {
    "max_rows": 50,
    "include_evidence": false,
    "evidence_per_row": 3,
    "sort": "desc"
  }
}
```

Nota:

```txt
output.shape no pertenece al query engine técnico.
output.shape pertenece al agent router.
```

## Validación Neon 2026-05-19

Validado con:

```txt
POST /api/gmb/query/neon-test
POST /api/query/compare?engine=neon
```

Resultado esperado:

```txt
source = neon_place_daily_metrics
valid_only=true excluye baja confianza
gap_vs_top no debe ser negativo
owned.position se calcula sobre ranking elegible
```

## Evidencia

El LLM nunca pide keys Redis.

Debe pedir:

```json
{
  "output": {
    "include_evidence": true,
    "evidence_per_row": 3
  }
}
```

Estado actual:

```txt
La evidencia sigue leyendo Redis.
El diseño objetivo es usar review_map en Neon para seleccionar review_keys relevantes y luego traer texto crudo desde Redis.
```

## Temporal

Temporal hoy funciona solo bien por ubicación en el motor legacy.

Soporta:

```txt
¿Qué ubicación empeoró más?
¿Qué ubicación perdió posición?
¿Dónde aumentó más el gap?
```

Pendiente:

```txt
validar temporal con Neon/place_daily_metrics antes de activarlo como default.
```

## delta_position

```txt
delta_position = position_to - position_from
```

Interpretación:

```txt
+2 = empeoró 2 posiciones
-2 = mejoró 2 posiciones
```
