# Data Model

## Principio actual

```txt
Neon/Postgres = catálogo maestro de places y scope multi-tenant.
Upstash/Redis = snapshots, reviews, índices y runtime/cache.
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

Clave primaria:

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
status=keep define los places activos para captura/runtime.
```

Uso actual:

```txt
captura barata lee place_id desde places.
captura cara lee place_id desde places.
query runtime debe resolver universo desde places.
```

Para CIDEF:

```txt
tenant_id = cidef
industry = automotive
```

Para otros tenants:

```txt
tenant_id = cliente
industry = industria del cliente
store_role = formato operativo flexible por industria
```

Ejemplos de store_role:

```txt
automotive: dealer | service | parts
home_improvement: homecenter | constructor | competitor_store
```

## Redis legacy: base clasificada

```txt
gmb:classified:v1
```

Estado:

```txt
legacy / fuente de migración.
```

Ya no debe ser la fuente maestra para captura.

Formato histórico:

```txt
HSET gmb:classified:v1 {place_id} {json}
```

## Snapshot diario

```txt
gmb:snapshot:{date}:{place_id}
```

Representa:

```txt
rating
review_count
estado observado ese día
```

Fecha:

```txt
captured_date usa America/Santiago.
```

## Review única global

```txt
gmb:review:{place_id}:{review_hash}
```

`review_hash`:

```txt
place_id + author + rating + publishTime
```

## Marca de vista diaria

```txt
gmb:review_seen:{date}:{place_id}:{review_hash}
```

Representa:

```txt
la review fue vista ese día
```

## Índices diarios en Redis

### snapshots

```txt
gmb:index:{date}:snapshot_keys
```

### place ids capturados

```txt
gmb:index:{date}:place_ids
```

### reviews

```txt
gmb:index:{date}:review_keys
```

### reviews por place

```txt
gmb:index:{date}:place:{place_id}:review_keys
```

## Rankings Redis actuales

### locations por store_role

```txt
gmb:index:{date}:locations:dealer
gmb:index:{date}:locations:service
gmb:index:{date}:locations:parts
gmb:index:{date}:locations:all
```

### ranking por ubicación

```txt
gmb:index:{date}:location:{location}:ranking:dealer
gmb:index:{date}:location:{location}:ranking:service
gmb:index:{date}:location:{location}:ranking:parts
gmb:index:{date}:location:{location}:ranking:all
```

Nota:

```txt
Estos índices existen por compatibilidad CIDEF.
El runtime multi-tenant debe partir desde Neon/placeResolver y luego leer snapshots Redis por place_id.
```

## Regla importante

```txt
El LLM nunca construye keys.
El backend resuelve todas las keys internas.
```
