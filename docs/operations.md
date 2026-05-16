# Operations

## Captura barata diaria

Usar:

```txt
POST /api/gmb/capture/demo-next
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
snapshot barato no debe repetir places ya capturados.
```

## Costo real

```txt
llamadas a Google Places
```
