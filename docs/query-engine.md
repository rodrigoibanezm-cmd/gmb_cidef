# Query Engine

## Endpoint técnico

```txt
POST /api/query/compare
```

Este endpoint devuelve salida raw.

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
lib/gmb/queryExecutor.js
```

## Contrato

### scope

```txt
intra
extra
temporal
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
store_role: dealer | service | parts | all
valid_only: boolean
location: string | null
```

`filters.location` es opcional.

Uso:

```json
{
  "filters": {
    "location": "mall_plaza_egana"
  }
}
```

Normalización:

```txt
trim
lowercase
espacios -> _
```

Efecto:

```txt
si filters.location existe, el backend lee solo esa ubicación.
no recorre todas las ubicaciones.
```

Validado:

```txt
filters.location="mall_plaza_egana" devuelve row_count=1 para gap/cause.
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

El backend resuelve:

```txt
gmb:index:{date}:place:{place_id}:review_keys
-> gmb:review:{place_id}:{review_hash}
```

## Temporal

Temporal hoy funciona solo bien por ubicación.

Soporta:

```txt
¿Qué ubicación empeoró más?
¿Qué ubicación perdió posición?
¿Dónde aumentó más el gap?
```

No soporta todavía:

```txt
brand temporal
operator temporal
store_role temporal
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
