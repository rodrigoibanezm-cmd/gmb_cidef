# Data Model

## Principio actual

```txt
Neon/Postgres = catálogo maestro + métricas + evidencia runtime.
```

## Neon / Postgres

### Tabla places

```txt
places
```

Representa:

```txt
catálogo maestro curado de lugares por tenant.
```

Clave primaria lógica:

```txt
(tenant_id, place_id)
```

Columnas principales:

```txt
tenant_id
place_id
industry
name
brand
normalized_location
market_group
region
operator
ownership_group
store_role
status
address
raw
created_at
updated_at
```

Regla:

```txt
status=keep define los places activos para runtime y captura.
```

### Tabla place_daily_metrics

```txt
place_daily_metrics
```

Representa:

```txt
métrica diaria compacta para runtime.
```

Uso:

```txt
ranking
gap_vs_top
agregados por brand/operator/store_role/location/market_group/region
```

Campos mínimos:

```txt
tenant_id
place_id
captured_date
rating
review_count
primary_type
updated_at
```

Regla:

```txt
/api/query/compare usa Neon exclusivamente.
```

### Tabla place_reviews

```txt
place_reviews
```

Representa:

```txt
evidencia textual runtime.
```

Campos principales:

```txt
tenant_id
place_id
review_hash
captured_date
review_date
rating
text
author
language
source
raw
updated_at
```

Uso:

```txt
output.include_evidence=true
```

## Separación runtime / ops

```txt
gmb_cidef = runtime/agente
gmb_cidef_ops = captura/admin
```

Flujo:

```txt
1. ops captura Google Places.
2. ops guarda snapshots/reviews en Neon.
3. runtime responde desde Neon.
```

## Regla importante

```txt
El LLM nunca construye keys.
El backend resuelve toda la persistencia.
```
