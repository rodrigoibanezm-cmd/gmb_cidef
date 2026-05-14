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

### Captura con reviews

```txt
POST /api/gmb/capture/reviews?limit=10&offset=0
POST /api/gmb/capture/reviews-next?limit=10
```

Field mask:

```txt
id,displayName,rating,userRatingCount,primaryType,reviews
```

Se fuerza español:

```txt
languageCode=es
```

Regla:

```txt
reviews = corrida puntual para demo/análisis
no cron diario
```

---

## 5. Keys principales en Upstash

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

---

## 6. Índices actuales

Se construyen con:

```txt
POST /api/gmb/index/build?date=2026-05-14
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

Resultado validado reciente:

```json
{
  "ok": true,
  "date": "2026-05-14",
  "snapshots": 632,
  "places": 632,
  "reviews": 1886,
  "places_with_reviews": 425,
  "locations": 58,
  "ranked_locations": 58
}
```

---

## 7. Motor `compare_query v1`

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

## 8. Agnosticismo del motor

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

## 9. Scope `extra`

Compara cliente vs mercado/competencia.

Ejemplo: mayores brechas válidas contra el líder local.

```json
{
  "date": "2026-05-14",
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

## 10. Scope `intra`

Compara dentro del universo propio definido por `own_values`.

Ejemplo: peores ubicaciones propias válidas por rating.

```json
{
  "date": "2026-05-14",
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

Validado:

```txt
row_count: 15
```

Lectura del resultado validado:

```txt
mall_plaza_egana aparece como peor ubicación propia válida
rating 2.9
reviews 10
confidence media
```

---

## 11. Preguntas que debe responder el agente

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

## 12. Endpoints actuales

### Captura

```txt
POST /api/gmb/capture/demo?limit=25&offset=0
POST /api/gmb/capture/demo-next?limit=25
POST /api/gmb/capture/reviews?limit=10&offset=0
POST /api/gmb/capture/reviews-next?limit=10
```

### Índices

```txt
POST /api/gmb/index/build?date=2026-05-14
```

### Query engine

```txt
POST /api/query/compare
```

### Lectura legacy / compatibilidad

```txt
GET /api/compare-all?date=2026-05-14
GET /api/compare?mall=puerto_montt&date=2026-05-14
```

### Debug

```txt
GET /api/gmb/debug/classified-sample?limit=3
```

---

## 13. Variables de entorno

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

## 14. Reglas de costo

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
Reviews no van a cron diario.
```

---

## 15. Problemas detectados y correcciones

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

---

## 16. Pendientes inmediatos

1. Crear `client_config` para no pasar `own_values` manualmente.
2. Crear endpoint de evidencia:

```txt
GET /api/evidence?place_id=...&date=2026-05-14&limit=5
```

3. Integrar `include_evidence=true` en `POST /api/query/compare`.
4. Compactar outputs para el agente cuando no necesite `place_id`.
5. Separar endpoints legacy de los nuevos endpoints de query.
6. Documentar ejemplos de queries naturales → `compare_query`.

---

## 17. Principio rector

La mejor solución es la más simple.

Para esta etapa:

```txt
capturar una vez
persistir en Upstash
indexar por fecha/rol
consultar con compare_query cerrado
```

No Google en runtime.
No SQL libre.
No endpoints ad hoc por cada pregunta.
No hardcodear clientes dentro del motor.
