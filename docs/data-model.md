# Data Model

## Base clasificada

```txt
gmb:classified:v1
```

Formato:

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

## Índices diarios

### snapshots

```txt
gmb:index:{date}:snapshot_keys
```

### place ids

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

## Rankings

### locations

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

## Compatibilidad actual

```txt
gmb:index:{date}:locations = dealer
gmb:index:{date}:location:{location}:ranking = dealer
```

## Regla importante

```txt
El LLM nunca construye keys.
El backend resuelve todas las keys internas.
```
