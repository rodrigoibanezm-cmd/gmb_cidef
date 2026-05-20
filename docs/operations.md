# Operations

## Estado validado

Validado al 2026-05-19:

```txt
snapshots: 727
indexed_places: 727
reviews: 2732
indexed_reviews: 2732
reviewed_places: 613
locations: 61
snapshots_updated: true
reviews_updated: true
updated: true
```

Interpretación:

```txt
Light completo: 727 lugares.
Reviews visibles: 2732.
Lugares con reviews visibles: 613.
Índices consistentes: sí.
```

## Arquitectura operativa actual

```txt
Neon:
- places
- place_daily_metrics

Redis:
- snapshots crudos
- reviews crudas
- índices legacy
```

## Multi-tenant

El runtime ya soporta:

```txt
tenant_id
industry
ownership_group
store_role
brand
location
```

Regla operativa:

```txt
1 backend
1 Neon
1 Redis
N tenants
N Custom GPTs
```

Recomendación actual:

```txt
hardcodear tenant_id en el schema/action del Custom GPT.
```

No permitir que el usuario final cambie tenant_id libremente.

## place_daily_metrics

Tabla Neon:

```txt
place_daily_metrics
```

Objetivo:

```txt
resolver preguntas métricas rápidas sin recorrer snapshots Redis.
```

Campos mínimos:

```txt
tenant_id
place_id
captured_date
rating
review_count
primary_type
```

## Backfill Neon metrics

Endpoint:

```txt
POST /api/admin/backfill/place-daily-metrics
```

Uso:

```powershell
Invoke-RestMethod `
  "https://gmb-cidef.vercel.app/api/admin/backfill/place-daily-metrics?date=2026-05-19&tenant_id=cidef" `
  -Method POST |
  ConvertTo-Json -Depth 10
```

Resultado esperado:

```txt
inserted = 727
missing = 0
failed = 0
```

## Tipos de captura

### 1. Captura barata

Objetivo:

```txt
persistir snapshots diarios baratos
```

Usa:

```txt
POST /api/gmb/capture/demo-next
```

Características:

```txt
lee place_ids desde Neon
usa tenant_id
no descarga reviews
solo snapshots/métricas
```

### PowerShell

```powershell
$base = "https://gmb-cidef.vercel.app"
$done = $false

while (-not $done) {
  $r = Invoke-RestMethod "$base/api/gmb/capture/demo-next?limit=25" -Method POST
  $result = $r.result

  Write-Host "date=$($result.captured_date) total=$($result.total) existing=$($result.existing) missing=$($result.missing) processed=$($result.processed) saved=$($result.saved) failed=$($result.failed) done=$($result.done)"

  $done = $result.done

  if (-not $done) {
    Start-Sleep -Seconds 5
  }
}
```

Regla:

```txt
si missing=0 debe resolver rápido.
```

### 2. Captura cara

Objetivo:

```txt
persistir evidencia textual visible
```

Usa:

```txt
POST /api/gmb/capture/reviews-next
```

Características:

```txt
lee place_ids desde Neon
usa tenant_id
guarda snapshots
guarda reviews crudas en Redis
```

### PowerShell

```powershell
$base = "https://gmb-cidef.vercel.app"
$done = $false

while (-not $done) {
  $r = Invoke-RestMethod "$base/api/gmb/capture/reviews-next?limit=5&confirm=true" -Method POST
  $result = $r.result

  Write-Host "date=$($result.captured_date) total=$($result.total) existing=$($result.existing) checked=$($result.checked) processed=$($result.processed) saved=$($result.saved) reviews_saved=$($result.reviews_saved) failed=$($result.failed) done=$($result.done)"

  $done = $result.done

  if (-not $done) {
    Start-Sleep -Seconds 10
  }
}
```

## Build de índices

```powershell
Invoke-RestMethod "$base/api/gmb/index/build?date=2026-05-19" -Method POST | ConvertTo-Json -Depth 8
```

## Status de índices

```powershell
Invoke-RestMethod "$base/api/gmb/index/status?date=2026-05-19" -Method GET | ConvertTo-Json -Depth 8
```

## Runtime Neon

Endpoint de validación:

```txt
POST /api/gmb/query/neon-test
```

Endpoint principal:

```txt
POST /api/query/compare?engine=neon
```

Resultado esperado:

```txt
source = neon_place_daily_metrics
engine = neon
```

## Diseño objetivo evidencia

Diseño actual:

```txt
Neon:
- catálogo
- métricas

Redis:
- evidencia textual cruda
```

Diseño siguiente:

```txt
review_map en Neon
-> selecciona review_keys relevantes
-> Redis devuelve solo reviews necesarias
```

Objetivo:

```txt
no recorrer miles de reviews en runtime.
```

## Reglas operativas

```txt
Google solo en captura.
Runtime preferente contra Neon.
Redis solo para evidencia y raw state.
```

```txt
reviews requiere confirm=true.
```

```txt
reviews no debe correr como cron diario completo.
```

```txt
snapshot histórico sí debe existir todos los días.
```

```txt
no repetir el mismo place dentro de la misma fecha.
```

## Costo real

```txt
llamadas a Google Places
```
