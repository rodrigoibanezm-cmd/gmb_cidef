# Operations

## Tipos de captura

### 1. Backfill / completar faltantes

Objetivo:

```txt
completar snapshots faltantes del día actual
```

Usa:

```txt
POST /api/gmb/capture/demo-next
```

Regla:

```txt
demo-next completa faltantes del día.
No es el job histórico definitivo.
```

No usar offsets manuales.

### PowerShell

```powershell
$base = "https://gmb-cidef.vercel.app"
$done = $false

while (-not $done) {
  $r = Invoke-RestMethod "$base/api/gmb/capture/demo-next?limit=25" -Method POST
  $result = $r.result

  Write-Host "existing=$($result.existing) missing=$($result.missing) processed=$($result.processed) saved=$($result.saved) failed=$($result.failed) done=$($result.done)"

  $done = $result.done

  if (-not $done) {
    Start-Sleep -Seconds 5
  }
}
```

### 2. Captura histórica diaria

Objetivo:

```txt
persistir estado diario histórico real
```

Regla:

```txt
el sistema sí debe guardar snapshots todos los días.
lo que no debe repetirse es el mismo place dentro de la misma fecha.
```

## Build de índices

```powershell
Invoke-RestMethod "$base/api/gmb/index/build?date=2026-05-15" -Method POST | ConvertTo-Json -Depth 8
```

## Status de índices

```powershell
Invoke-RestMethod "$base/api/gmb/index/status?date=2026-05-15" -Method GET | ConvertTo-Json -Depth 8
```

## Captura con reviews

Usar solo cuando se necesite evidencia textual.

```powershell
$base = "https://gmb-cidef.vercel.app"
$done = $false

while (-not $done) {
  $r = Invoke-RestMethod "$base/api/gmb/capture/reviews-next?limit=3&confirm=true" -Method POST
  $result = $r.result

  Write-Host "existing=$($result.existing) checked=$($result.checked) processed=$($result.processed) saved=$($result.saved) reviews_saved=$($result.reviews_saved) failed=$($result.failed) done=$($result.done)"

  $done = $result.done

  if (-not $done) {
    Start-Sleep -Seconds 10
  }
}
```

## Reglas operativas

```txt
Google solo en captura.
Runtime solo contra Upstash.
```

```txt
reviews requiere confirm=true.
```

```txt
reviews no debe correr como cron diario.
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
