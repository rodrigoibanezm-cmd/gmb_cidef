# GMB CIDEF — Inteligencia reputacional automotor

## 1. Resumen

Este proyecto construye una base histórica de reputación pública del ecosistema automotor chileno usando Google Places como fuente de ingesta.

Decisión central:

```txt
Google Places se usa solo para captura.
El agente nunca consulta Google Places en runtime.
El agente consulta JSON generado desde Upstash e índices.
```

El objetivo es tener un motor comparativo capaz de responder preguntas de reputación por ubicación, marca, operador, rol de tienda, rating, volumen de reseñas, brechas competitivas y evidencia textual.

---

## 2. Principio de arquitectura

El backend no debe “pensar” ni escribir respuestas ejecutivas.

El backend debe:

```txt
recibir una query estructurada
validar contrato
ejecutar contra datos persistidos/indexados
devolver JSON controlado
```

El agente debe:

```txt
entender la pregunta
construir compare_query
llamar al backend
interpretar el JSON
responder en lenguaje ejecutivo
```

No se usa SQL libre. Se usa un DSL cerrado tipo `compare_query`.

---

## 3. Estado actual

Base clasificada en Upstash:

```txt
gmb:classified:v1
```

Formato:

```txt
HSET gmb:classified:v1 {place_id} {json}
```

Ejemplo:

```json
{
  "place_id": "...",
  "name": "DFSK - Servimaq",
  "address": "...",
  "brand": "dfsk",
  "normalized_location": "puerto_montt",
  "operator": "servimaq",
  "ownership_group": "cidef",
  "store_role": "dealer",
  "status": "keep",
  "confidence": 0.95
}
```

Dato validado:

```txt
727 place_id en gmb:classified:v1
```

---

## 4. Captura histórica

### Captura demo barata, sin reviews

```txt
POST /api/gmb/capture/demo?limit=25&offset=0
POST /api/gmb/capture/demo-next?limit=25
```

Field mask:

```txt
id,displayName,rating,userRatingCount,primaryType
```

Regla operativa actual:

```txt
demo-next calcula los snapshots faltantes reales del día.
No confía en offset ni en run.done.
No vuelve a llamar Google si gmb:snapshot:{date}:{place_id} ya existe.
```

### Captura con reviews

```txt
POST /api/gmb/capture/reviews?limit=10&offset=0&confirm=true
POST /api/gmb/capture/reviews-next?limit=10&confirm=true
```

Field mask:

```txt
id,displayName,rating,userRatingCount,primaryType,reviews
```

Se fuerza español:

```txt
languageCode=es
```

Regla operativa actual:

```txt
reviews requiere confirm=true.
reviews-next calcula faltantes reales.
No vuelve a llamar Google si ya existe snapshot del día y review_keys por place.
reviews = corrida puntual para demo/análisis.
no cron diario.
```

---

## 5. Flujo operativo seguro

### Snapshot barato diario

Usar `demo-next`, no `demo`, para no depender de offsets manuales.

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

Al terminar, construir índice final:

```powershell
Invoke-RestMethod "$base/api/gmb/index/build?date=2026-05-15" -Method POST | ConvertTo-Json -Depth 8
```

Validar consistencia:

```powershell
Invoke-RestMethod "$base/api/gmb/index/status?date=2026-05-15" -Method GET | ConvertTo-Json -Depth 8
```

Resultado esperado:

```txt
snapshots_updated=true
snapshots=727
indexed_places=727
updated=true
```

Durante la captura, `updated=false` puede ser normal, porque puede haber snapshots nuevos aún no indexados.

### Snapshot caro con reviews

Usar solo cuando se necesite evidencia textual.

```powershell
$base = "https://gmb-cidef.vercel.app"
$done = $false

while (-not $done) {
  $r = Invoke-RestMethod "$base/api/gmb/capture/reviews-next?limit=10&confirm=true" -Method POST
  $result = $r.result

  Write-Host "existing=$($result.existing) missing=$($result.missing) processed=$($result.processed) saved=$($result.saved) reviews_saved=$($result.reviews_saved) failed=$($result.failed) done=$($result.done)"

  $done = $result.done

  if (-not $done) {
    Start-Sleep -Seconds 10
  }
}
```

Después de reviews, reconstruir índice:

```powershell
Invoke-RestMethod "$base/api/gmb/index/build?date=2026-05-15" -Method POST | ConvertTo-Json -Depth 8
```

Validar:

```powershell
Invoke-RestMethod "$base/api/gmb/index/status?date=2026-05-15" -Method GET | ConvertTo-Json -Depth 8
```

Resultado esperado si hay reviews:

```txt
reviews_updated=true
missing_review_keys_in_global_index_count=0
missing_place_review_index_count=0
```

---

## 6. Keys principales en Upstash

### Fuente clasificada

```txt
gmb:classified:v1
```

### Snapshots

```txt
gmb:snapshot:{date}:{place_id}
```

### Reviews

```txt
gmb:review:{date}:{place_id}:{review_hash}
```

Hash estable:

```txt
place_id + author + rating + publishTime
```

No se usa el texto para hashear, porque Google puede traducir la review y cambiar el texto.

### Estado de captura

```txt
gmb:capture:run:{date}
gmb:capture:reviews:run:{date}
```

Importante:

```txt
Las keys run son auxiliares.
El estado de verdad es la existencia real de snapshots/reviews en Redis.
```

---

## 7. Índices actuales

Se construyen con:

```txt
POST /api/gmb/index/build?date=2026-05-15
```

Se validan con:

```txt
GET /api/gmb/index/status?date=2026-05-15
```

`status` valida:

```txt
snapshots vs place_ids indexados
review_keys reales vs review_keys indexados globales
review_keys por place vs índices por place
```

Genera:

```txt
gmb:index:{date}:snapshot_keys
gmb:index:{date}:place_ids
gmb:index:{date}:review_keys
gmb:index:{date}:place:{place_id}:review_keys
```

Y rankings por rol:

```txt
gmb:index:{date}:locations:dealer
gmb:index:{date}:locations:service
gmb:index:{date}:locations:parts
gmb:index:{date}:locations:all

gmb:index:{date}:location:{location}:ranking:dealer
gmb:index:{date}:location:{location}:ranking:service
gmb:index:{date}:location:{location}:ranking:parts
gmb:index:{date}:location:{location}:ranking:all
```

Compatibilidad actual:

```txt
gmb:index:{date}:locations = dealer
gmb:index:{date}:location:{location}:ranking = dealer
```

---

## 8. Motor `compare_query v1`

Endpoint principal:

```txt
POST /api/query/compare
```

Archivo de contrato:

```txt
lib/gmb/queryContract.js
```

Archivo ejecutor:

```txt
lib/gmb/queryExecutor.js
```

El contrato normaliza y valida:

```txt
scope: intra | extra
dimension: location | brand | operator | store_role
metric: rating | reviews_count | gap_vs_top | position
ownership_group: own | competitor | all
store_role: dealer | service | parts | all
sort: asc | desc
```

Defaults:

```json
{
  "scope": "extra",
  "dimension": "location",
  "metric": "gap_vs_top",
  "filters": {
    "ownership_group": "all",
    "own_values": ["own"],
    "store_role": "dealer",
    "valid_only": true
  },
  "output": {
    "max_rows": 50,
    "include_evidence": false,
    "evidence_per_row": 3,
    "sort": "desc"
  }
}
```

Límites de salida:

```txt
max_rows default 50, hard max 200
evidence_per_row default 3, hard max 10
```

Importante:

```txt
limit/max_rows controla salida, no profundidad de análisis.
El backend puede leer todo el universo indexado.
El agente no debe recibir 727 registros crudos salvo caso excepcional.
```

---

## 9. Agnosticismo del motor

El motor no debe hardcodear CIDEF.

`own` se define por query/configuración:

```json
{
  "filters": {
    "ownership_group": "own",
    "own_values": ["cidef"],
    "store_role": "dealer",
    "valid_only": true
  }
}
```

Para otro cliente:

```json
{
  "filters": {
    "ownership_group": "own",
    "own_values": ["cliente_x"],
    "store_role": "dealer",
    "valid_only": true
  }
}
```

Regla:

```txt
CIDEF es configuración, no lógica del motor.
```

Pendiente futuro:

```txt
client_config
```

Ejemplo conceptual:

```json
{
  "client_id": "cidef",
  "own_values": ["cidef"]
}
```

---

## 10. Scope `extra`

Compara cliente vs mercado/competencia.

Ejemplo: mayores brechas válidas contra el líder local.

```json
{
  "date": "2026-05-15",
  "scope": "extra",
  "dimension": "location",
  "metric": "gap_vs_top",
  "filters": {
    "ownership_group": "all",
    "own_values": ["cidef"],
    "store_role": "dealer",
    "valid_only": true
  },
  "output": {
    "max_rows": 10,
    "sort": "desc"
  }
}
```

Respuesta esperada:

```txt
ubicaciones con gap_vs_top ordenadas
solo con señales válidas si valid_only=true
```

`valid_only=true` significa:

```txt
solo señales con confidence media o alta
```

---

## 11. Scope `intra`

Compara dentro del universo propio definido por `own_values`.

Ejemplo: peores ubicaciones propias válidas por rating.

```json
{
  "date": "2026-05-15",
  "scope": "intra",
  "dimension": "location",
  "metric": "rating",
  "filters": {
    "ownership_group": "own",
    "own_values": ["cidef"],
    "store_role": "dealer",
    "valid_only": true
  },
  "output": {
    "max_rows": 20,
    "sort": "asc"
  }
}
```

---

## 12. Preguntas que debe responder el agente

### Comparación externa

```txt
¿Dónde mi red pierde más contra el líder local?
¿Dónde lidero?
¿En qué ubicaciones tengo gap bajo pero volumen alto?
¿Qué competidor lidera en cada zona?
¿Qué ubicaciones tienen competencia fuerte y presencia propia débil?
```

### Comparación interna

```txt
¿Cuáles son mis peores ubicaciones propias?
¿Qué operador propio rinde peor?
¿Qué marca propia tiene peor reputación?
¿Venta, servicio o repuestos están peor evaluados?
¿Qué locales propios tienen señal válida suficiente para intervenir?
```

### Evidencia textual

```txt
¿Qué dicen las reviews malas?
Dame 3 evidencias reales.
¿Qué temas aparecen: atención, espera, servicio técnico, repuestos?
```

---

## 13. Endpoints actuales

### Captura

```txt
POST /api/gmb/capture/demo?limit=25&offset=0
POST /api/gmb/capture/demo-next?limit=25
POST /api/gmb/capture/reviews?limit=10&offset=0&confirm=true
POST /api/gmb/capture/reviews-next?limit=10&confirm=true
```

### Índices

```txt
POST /api/gmb/index/build?date=2026-05-15
GET /api/gmb/index/status?date=2026-05-15
```

### Query engine

```txt
POST /api/query/compare
```

### Lectura legacy / compatibilidad

```txt
GET /api/compare-all?date=2026-05-15
GET /api/compare?mall=puerto_montt&date=2026-05-15
```

### Debug

```txt
GET /api/gmb/debug/classified-sample?limit=3
```

---

## 14. Variables de entorno

En Vercel:

```txt
KV_REST_API_URL
KV_REST_API_TOKEN
GOOGLE_MAPS_API_KEY
```

La API key de Google debe tener habilitada:

```txt
Places API (New)
```

---

## 15. Reglas de costo

Costo real:

```txt
llamadas a Google Places
```

Costo marginal bajo:

```txt
lectura de Upstash / índices
```

Regla:

```txt
Google solo en captura.
Runtime solo contra Upstash.
Snapshot barato no repite places ya capturados en la fecha.
Snapshot con reviews requiere confirm=true y no debe usarse como cron diario.
```

---

## 16. Problemas detectados y correcciones

### compare-all lento

Causa:

```txt
reconstruía rankings y leía demasiado en runtime
```

Corrección:

```txt
índices por ubicación y rol
```

### Duplicación de reviews inglés/español

Causa:

```txt
hash incluía texto traducido
```

Corrección:

```txt
hash = place_id + author + rating + publishTime
```

### Agrupación vacía

Causa:

```txt
se buscaba mall, pero la clasificación usa normalized_location
```

Corrección:

```txt
normalized_location como agrupador principal
```

### Señales débiles confundidas con urgencias

Causa:

```txt
ratings con muy pocas reviews inflaban gaps
```

Corrección:

```txt
valid_only=true por defecto
confidence media/alta para análisis globales
```

### Motor no agnóstico

Causa:

```txt
cidef hardcodeado como own
```

Corrección:

```txt
own_values viene en la query
```

### Snapshot barato repetía gasto

Causa:

```txt
se avanzaba por offset y se hacía SET sobre snapshots existentes
```

Corrección:

```txt
demo-next calcula faltantes reales por fecha antes de llamar Google
```

### Estado run corrupto

Causa:

```txt
run.done podía quedar inconsistente con snapshots reales
```

Corrección:

```txt
el estado de verdad son snapshots/reviews existentes, no run.done
```

### Índice desactualizado durante captura

Causa:

```txt
captura y build de índice son fases separadas
```

Corrección:

```txt
GET /api/gmb/index/status valida consistencia antes de consultar
```

---

## 17. Pendientes inmediatos

1. Crear `client_config` para no pasar `own_values` manualmente.
2. Crear endpoint de evidencia:

```txt
GET /api/evidence?place_id=...&date=2026-05-15&limit=5
```

3. Integrar `include_evidence=true` en `POST /api/query/compare`.
4. Compactar outputs para el agente cuando no necesite `place_id`.
5. Separar endpoints legacy de los nuevos endpoints de query.
6. Documentar ejemplos de queries naturales → `compare_query`.

---

## 18. Principio rector

La mejor solución es la más simple.

Para esta etapa:

```txt
capturar faltantes
persistir en Upstash
validar índice
consultar con compare_query cerrado
```

No Google en runtime.
No SQL libre.
No endpoints ad hoc por cada pregunta.
No hardcodear clientes dentro del motor.
