# Data Model

## Principio actual

```txt
Neon/Postgres = catálogo maestro + métricas runtime.
Upstash/Redis = evidencia cruda + snapshots + índices legacy/fallback.
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

Modelo de ubicación:

```txt
normalized_location = comuna / unidad mínima comparable
market_group = ciudad / zona mayor
region = región
```

### Tabla place_daily_metrics

```txt
place_daily_metrics
```

Representa:

```txt
métrica diaria compacta para runtime Neon.
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
/api/query/compare usa Neon por default leyendo places + place_daily_metrics.
```

## Redis / Upstash

Redis ya no es el runtime principal.

Uso actual:

```txt
snapshots crudos
reviews crudas
evidencia textual
índices legacy/fallback
```

## Redis legacy: base clasificada

```txt
gmb:classified:v1
```

Estado:

```txt
legacy / fuente histórica de migración.
```

Ya no debe ser la fuente maestra para captura ni runtime.

## Snapshot diario

Formato multi-tenant actual:

```txt
gmb:{tenant_id}:snapshot:{date}:{place_id}
```

Representa:

```txt
rating
review_count
estado observado ese día
raw mínimo de Google Places
```

Fecha:

```txt
captured_date usa America/Santiago.
```

## Review única global por tenant

```txt
gmb:{tenant_id}:review:{place_id}:{review_hash}
```

`review_hash`:

```txt
place_id + author + rating + publishTime
```

## Marca de vista diaria

```txt
gmb:{tenant_id}:review_seen:{date}:{place_id}:{review_hash}
```

Representa:

```txt
la review fue vista ese día
```

## Índices diarios Redis legacy/fallback

### snapshots

```txt
gmb:{tenant_id}:index:{date}:snapshot_keys
```

### place ids capturados

```txt
gmb:{tenant_id}:index:{date}:place_ids
```

### reviews

```txt
gmb:{tenant_id}:index:{date}:review_keys
```

### reviews por place

```txt
gmb:{tenant_id}:index:{date}:place:{place_id}:review_keys
```

## Rankings Redis legacy

```txt
gmb:{tenant_id}:index:{date}:locations:{store_role}
gmb:{tenant_id}:index:{date}:location:{location}:ranking:{store_role}
```

Nota:

```txt
Estos índices existen por compatibilidad/fallback.
El runtime principal usa Neon.
```

## Separación runtime / ops

```txt
gmb_cidef = runtime/agente
gmb_cidef_ops = captura/backfill/index/admin
```

Flujo de datos:

```txt
1. ops captura Google Places.
2. ops guarda snapshot/reviews en Redis.
3. ops hace backfill a place_daily_metrics.
4. runtime responde desde Neon.
5. Redis se usa para evidencia o fallback legacy.
```

## Regla importante

```txt
El LLM nunca construye keys.
El backend resuelve todas las keys internas.
```
