# GMB CIDEF — Inteligencia reputacional automotor

## 1. Resumen

Este proyecto construye una base histórica de reputación pública del ecosistema automotor chileno usando Google Places como fuente de ingesta.

Decisión central:

```txt
Google Places se usa solo para captura.
El agente nunca consulta Google Places en runtime.
El agente consulta JSON generado desde Upstash e índices.
```

El objetivo es tener un motor comparativo capaz de responder preguntas de reputación por ubicación, marca, operador, rol de tienda, rating, volumen de reseñas, brechas competitivas, evidencia textual y cambios temporales básicos por ubicación.

---

## 2. Estado validado actual

Validado al 2026-05-15:

```txt
snapshots: 727
indexed_places: 727
reviews: 717
indexed_reviews: 717
reviewed_places: 156
locations: 61
snapshots_updated: true
reviews_updated: true
updated: true
```

Interpretación:

```txt
Light completo: 727 lugares.
Reviews disponibles: 717 reviews visibles.
Lugares con reviews visibles: 156.
Índices consistentes: sí.
```

Router validado por PowerShell:

```txt
POST /api/agent/router
```

Intents validados:

```txt
ranking: OK, devuelve ubicaciones propias.
gap: OK, devuelve brecha vs líder y evidencia opcional.
evidence: OK, devuelve evidencia sin exponer keys Redis.
action: OK, devuelve datos para que el LLM defina prioridad/acción.
cause: OK, devuelve datos y evidencia para que el LLM interprete causa.
temporal: implementado, pero requiere índices comparables entre fechas.
```

Regla arquitectónica validada:

```txt
LLM = semántica in/out.
Backend = datos, rutas, contratos, cálculos, evidencia.
```

---

## 3. Principio de arquitectura

El backend no debe “pensar”, clasificar semánticamente ni escribir respuestas ejecutivas.

El backend debe:

```txt
recibir una query estructurada
validar contrato
ejecutar contra datos persistidos/indexados
devolver JSON controlado
```

El LLM debe:

```txt
entender la pregunta
clasificar intención
interpretar evidencia
definir causa, prioridad y acción cuando corresponda
redactar la salida ejecutiva
```

No se usa SQL libre. Se usa un DSL cerrado tipo `compare_query`.

Reglas clave:

```txt
El LLM decide intención.
El LLM decide semántica.
El backend decide keys.
El backend calcula métricas.
```

El LLM nunca debe construir keys Redis.

El backend nunca debe decidir:

```txt
causa
prioridad
action/recomendación ejecutiva
sentimiento semántico
```

---

## 4. Base clasificada

Base clasificada en Upstash:

```txt
gmb:classified:v1
```

Formato:

```txt
HSET gmb:classified:v1 {place_id} {json}
```

Dato validado:

```txt
727 place_id en gmb:classified:v1
```

Ownership normalizado:

```txt
own
competitor
```

Normalización disponible desde el endpoint de índice:

```txt
POST /api/gmb/index/build?date=2026-05-15&normalize_ownership=true
```

Regla actual de migración CIDEF:

```txt
cidef -> own
todo lo demás -> competitor
```

Nota:

```txt
Esta normalización es una migración operativa para la base actual.
Para multi-tenant real, la regla debe salir de client_config, no quedar hardcodeada.
```

---

## 5. Captura histórica

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
reviews-next calcula faltantes reales desde el índice diario.
No vuelve a llamar Google si ya existe review_keys por place para esa fecha.
reviews = corrida puntual para demo/análisis.
no cron diario.
```

---

## 6. Modelo de keys: light vs caro

### Snapshot light diario

El snapshot diario de rating/review_count sigue siendo fechado:

```txt
gmb:snapshot:{date}:{place_id}
```

### Review única global

Las reviews no deben duplicarse por fecha.

La review única se guarda con key estable:

```txt
gmb:review:{place_id}:{review_hash}
```

`review_hash` se calcula con:

```txt
place_id + author + rating + publishTime
```

### Marca de vista por fecha

Para saber que una review fue vista en una captura determinada:

```txt
gmb:review_seen:{date}:{place_id}:{review_hash}
```

### Índice diario para lectura del agente

El agente y endpoints LLM no deben buscar reviews escaneando keys.

Deben leer:

```txt
gmb:index:{date}:place:{place_id}:review_keys
```

Ese índice diario apunta idealmente a las keys globales:

```txt
gmb:review:{place_id}:{review_hash}
```

Nota operativa:

```txt
Puede existir mezcla histórica de source_key viejo y nuevo en evidencia.
No rompe lectura porque el índice resuelve las keys disponibles.
La dirección futura es mantener solo keys globales.
```

---

## 7. Flujo operativo seguro

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

### Snapshot caro con reviews

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

Después de reviews, reconstruir índice:

```powershell
Invoke-RestMethod "$base/api/gmb/index/build?date=2026-05-15" -Method POST | ConvertTo-Json -Depth 8
```

---

## 8. Índices actuales

Se construyen con:

```txt
POST /api/gmb/index/build?date=2026-05-15
```

Opcionalmente normaliza ownership antes de indexar:

```txt
POST /api/gmb/index/build?date=2026-05-15&normalize_ownership=true
```

Se validan con:

```txt
GET /api/gmb/index/status?date=2026-05-15
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

## 9. Motor `compare_query v1`

Endpoint técnico:

```txt
POST /api/query/compare
```

Entrada principal para el LLM:

```txt
POST /api/agent/router
```

Archivo router:

```txt
lib/gmb/agentRouter.js
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
scope: intra | extra | temporal
dimension: location | brand | operator | store_role
metric: rating | reviews_count | gap_vs_top | position | delta_rating | delta_reviews_count | delta_gap_vs_top | delta_position
ownership_group: own | competitor | all
store_role: dealer | service | parts | all
sort: asc | desc
```

### Agent router

El LLM entra por:

```txt
POST /api/agent/router
```

Payload esperado:

```json
{
  "intent": "gap",
  "params": {
    "date": "2026-05-15",
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "max_rows": 5,
      "include_evidence": true,
      "evidence_per_row": 2
    }
  }
}
```

Intents actuales:

```txt
ranking
gap
temporal
evidence
action
cause
```

Reglas del router:

```txt
ranking -> compare_query con default ownership_group="own"
gap -> compare_query con default metric="gap_vs_top"
temporal -> compare_query con scope="temporal"
evidence -> compare_query con include_evidence=true
action -> compare_query con semantic_required=true
cause -> compare_query con include_evidence=true y semantic_required=true
```

`action` y `cause` no deciden nada en backend.
Solo entregan datos suficientes para que el LLM interprete.

`POST /api/query/compare` queda como endpoint técnico/debug.

### Evidencia

Para evidencia, el LLM no pide keys.

Debe pedir:

```json
{
  "output": {
    "include_evidence": true,
    "evidence_per_row": 3
  }
}
```

El backend resuelve internamente:

```txt
gmb:index:{date}:place:{place_id}:review_keys
-> gmb:review:{place_id}:{review_hash}
```

El output de evidencia no expone keys Redis.

---

## 10. Intents semánticos: `action` y `cause`

Estos intents son rutas de datos, no motores de decisión.

### `action`

Uso:

```txt
Preguntas como: ¿qué hago?, ¿qué ubicación priorizo?, ¿dónde hay riesgo?
```

Backend devuelve:

```txt
ubicaciones ordenadas por gap_vs_top
rating propio
reviews propias
confidence
posición
top competidor
evidencia opcional
```

LLM decide:

```txt
prioridad
motivo
acción recomendada
lenguaje ejecutivo
```

### `cause`

Uso:

```txt
Preguntas como: ¿por qué estoy mal?, ¿qué dicen las reviews?, ¿cuál parece el problema?
```

Backend devuelve:

```txt
ubicaciones relevantes
gap/rating/confidence
evidencia textual
reviews asociadas
```

LLM decide:

```txt
causa probable
patrones semánticos
síntesis
riesgo narrativo
```

Validado:

```txt
action y cause devuelven engine="compare_query" y semantic_required=true.
No devuelven priority, reason, action, top_issue, issue_type ni topic_counts.
```

Archivos obsoletos/no usados:

```txt
lib/gmb/actionPolicy.js
lib/gmb/causeSignals.js
```

Se pueden eliminar más adelante si no se reutilizan.

---

## 11. Comparación temporal — alcance actual

La primera capa temporal compara cambios por ubicación entre dos fechas.

Soporta bien preguntas como:

```txt
¿Qué ubicación empeoró más?
¿Dónde aumentó más el gap vs líder?
¿Dónde subió o bajó el rating?
¿Dónde cambió más el volumen de reviews?
¿Qué ubicación perdió posición?
```

No soporta todavía comparación temporal agregada por:

```txt
brand
operator
store_role
```

Aunque el contrato acepta esas dimensiones, `scope=temporal` hoy usa summaries por ubicación.

Requisito operativo:

```txt
Temporal requiere índices comparables entre date_from y date_to.
Si una fecha fue indexada antes de normalizar ownership o no tiene índice equivalente, puede devolver rows=[].
```

Definición de posición:

```txt
delta_position = position_to - position_from
```

Interpretación:

```txt
+2 = empeoró 2 posiciones
-2 = mejoró 2 posiciones
```

---

## 12. Endpoints actuales

### Agent router

```txt
POST /api/agent/router
```

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
POST /api/gmb/index/build?date=2026-05-15&normalize_ownership=true
GET /api/gmb/index/status?date=2026-05-15
```

### Query engine técnico

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

## 13. Reglas de costo

Costo real:

```txt
llamadas a Google Places
```

Regla:

```txt
Google solo en captura.
Runtime solo contra Upstash.
Snapshot barato no repite places ya capturados en la fecha.
Snapshot con reviews requiere confirm=true y no debe usarse como cron diario.
Reviews reales se guardan una sola vez por review_hash global.
```

---

## 14. Problemas detectados y correcciones

### Agent router agregado

Causa:

```txt
El LLM necesitaba una entrada única y no debía llamar motores internos directamente.
```

Corrección:

```txt
POST /api/agent/router recibe intent + params y deriva a compare_query.
```

### Frontera semántica corregida

Causa:

```txt
Se intentó poner prioridad, acción y causa dentro del backend.
```

Corrección:

```txt
action y cause quedaron como rutas de datos.
semantic_required=true indica que el LLM debe interpretar.
```

---

## 15. Pendientes inmediatos

1. Compactar outputs para el agente cuando no necesite `place_id`.
2. Eliminar o aislar archivos obsoletos `actionPolicy.js` y `causeSignals.js`.
3. Separar endpoints legacy de los nuevos endpoints de query.
4. Comparación temporal agregada por brand/operator/store_role.
5. Diferencia de reviews entre fechas usando `review_seen:{date}`.
6. Migrar normalización de ownership a `client_config`.
7. Limpiar mezcla histórica de keys viejas/nuevas en evidencia.

---

## 16. Principio rector

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
