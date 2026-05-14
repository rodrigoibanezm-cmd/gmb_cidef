# GMB CIDEF — Inteligencia reputacional automotor

## 1. Resumen

Este proyecto construye una base histórica de reputación pública del ecosistema automotor chileno usando Google Places como fuente de captura.

Decisión central:

```txt
Google Places se usa solo para ingesta.
El agente nunca consulta Google Places en runtime.
El agente lee datos ya descargados e indexados en Upstash.
```

El objetivo es permitir análisis competitivo por ubicación, marca, operador, rating, volumen de reseñas y evidencia textual.

---

## 2. Estado actual

Ya existe una base clasificada en Upstash:

```txt
gmb:classified:v1
```

Formato:

```txt
HSET gmb:classified:v1 {place_id} {json}
```

Ejemplo de campos clasificados:

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

Dato validado actual:

```txt
727 place_id en gmb:classified:v1
```

---

## 3. Arquitectura operativa

### Fuente base

```txt
gmb:classified:v1
```

Contiene los `place_id` y clasificación comercial.

### Captura diaria barata

Endpoint:

```txt
POST /api/gmb/capture/demo?limit=25&offset=0
POST /api/gmb/capture/demo-next?limit=25
```

Campo Google usado en modo demo:

```txt
id,displayName,rating,userRatingCount,primaryType
```

No captura reviews.

### Captura con reviews

Endpoint manual:

```txt
POST /api/gmb/capture/reviews?limit=10&offset=0
```

Endpoint con avance automático:

```txt
POST /api/gmb/capture/reviews-next?limit=10
```

Campo Google usado:

```txt
id,displayName,rating,userRatingCount,primaryType,reviews
```

Se fuerza idioma español:

```txt
languageCode=es
```

La captura con reviews es para demo o corridas puntuales, no para cron diario.

---

## 4. Keys principales en Upstash

### Fuente clasificada

```txt
gmb:classified:v1
```

### Snapshots diarios

```txt
gmb:snapshot:{YYYY-MM-DD}:{place_id}
```

Ejemplo:

```json
{
  "captured_at": "2026-05-14T13:54:36.944Z",
  "captured_date": "2026-05-14",
  "place_id": "...",
  "name": "DFSK - Servimaq",
  "rating": 4.9,
  "review_count": 20,
  "primary_type": "car_dealer",
  "source": "google_places_demo_no_reviews"
}
```

### Reviews históricas

```txt
gmb:review:{YYYY-MM-DD}:{place_id}:{review_hash}
```

Ejemplo:

```json
{
  "captured_at": "2026-05-14T13:54:36.944Z",
  "captured_date": "2026-05-14",
  "place_id": "...",
  "review_hash": "...",
  "author": "...",
  "review_date": "2025-11-17T13:43:52Z",
  "rating": 1,
  "text": "Texto en español",
  "language": "es",
  "original_text": "...",
  "original_language": "...",
  "source": "google_places_reviews_once"
}
```

Regla de hash:

```txt
place_id + author + rating + publishTime
```

No se usa el texto para hashear, porque el texto cambia si Google traduce la review.

### Estado de captura

```txt
gmb:capture:run:{YYYY-MM-DD}
gmb:capture:reviews:run:{YYYY-MM-DD}
```

---

## 5. Índices

Los endpoints runtime no deben calcular todo leyendo snapshots/reviews.

Primero se construyen índices:

```txt
POST /api/gmb/index/build?date=2026-05-14
```

Este endpoint genera:

```txt
gmb:index:{date}:snapshot_keys
gmb:index:{date}:place_ids
gmb:index:{date}:review_keys
gmb:index:{date}:place:{place_id}:review_keys
gmb:index:{date}:locations
gmb:index:{date}:location:{location}:ranking
```

Ejemplo de resultado real:

```json
{
  "ok": true,
  "date": "2026-05-14",
  "snapshots": 632,
  "places": 632,
  "reviews": 1886,
  "places_with_reviews": 425,
  "locations": 65,
  "ranked_locations": 62
}
```

---

## 6. Contrato de lectura del agente

El agente debe leer solo desde índices y datos persistidos.

### Resumen global

```txt
GET /api/compare-all?date=2026-05-14
```

Debe leer:

```txt
gmb:index:{date}:locations
```

No debe leer Google.
No debe leer reviews.
No debe reconstruir rankings en runtime.

### Ranking por ubicación

```txt
GET /api/compare?mall=puerto_montt&date=2026-05-14
```

Debe leer:

```txt
gmb:index:{date}:location:{location}:ranking
```

Por defecto no devuelve reviews.

### Ranking con evidencia textual

```txt
GET /api/compare?mall=puerto_montt&date=2026-05-14&include_reviews=true&evidence_limit=3
```

Solo en este caso lee:

```txt
gmb:index:{date}:place:{place_id}:review_keys
gmb:review:{date}:{place_id}:{review_hash}
```

---

## 7. Endpoints actuales

### Captura demo sin reviews

```txt
POST /api/gmb/capture/demo?limit=25&offset=0
POST /api/gmb/capture/demo-next?limit=25
```

### Captura con reviews

```txt
POST /api/gmb/capture/reviews?limit=10&offset=0
POST /api/gmb/capture/reviews-next?limit=10
```

### Construcción de índices

```txt
POST /api/gmb/index/build?date=2026-05-14
```

### Lectura analítica

```txt
GET /api/compare-all?date=2026-05-14
GET /api/compare?mall=puerto_montt&date=2026-05-14
GET /api/compare?mall=puerto_montt&date=2026-05-14&include_reviews=true&evidence_limit=3
```

### Debug

```txt
GET /api/gmb/debug/classified-sample?limit=3
```

---

## 8. Variables de entorno

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

Para pruebas iniciales puede estar sin restricción de aplicación. Luego debe restringirse correctamente.

---

## 9. Reglas de costo

Modo barato:

```txt
captura demo sin reviews
```

Uso recomendado:

```txt
1 corrida diaria como máximo
sin reviews
```

Modo enriquecido:

```txt
captura con reviews
```

Uso recomendado:

```txt
corridas puntuales para demo o análisis profundo
no cron diario
```

Con 727 places:

```txt
1 corrida completa = 727 Place Details
```

La captura con reviews potencia el demo, pero debe ejecutarse controladamente.

---

## 10. Decisiones de diseño importantes

- El `place_id` es el identificador central.
- El agente no consulta Google Places.
- Google Places es fuente de ingesta, no fuente operacional.
- Upstash guarda snapshots, reviews e índices.
- Los endpoints de análisis deben leer índices precalculados.
- `compare-all` debe ser liviano.
- Reviews solo se leen cuando se pide evidencia.
- El hash de review no usa texto.
- `normalized_location` reemplaza a `mall` como agrupador principal.
- `ownership_group` diferencia CIDEF vs competencia.
- `store_role` distingue dealer, service y parts.

---

## 11. Problemas detectados y decisiones correctivas

### Problema: compare-all lento

Causa:

```txt
comparaba todas las ubicaciones reconstruyendo rankings en runtime
```

Corrección:

```txt
precalcular gmb:index:{date}:locations
```

### Problema: reviews duplicadas inglés/español

Causa:

```txt
review_hash usaba texto traducido
```

Corrección:

```txt
review_hash usa place_id + author + rating + publishTime
```

### Problema: agrupación vacía

Causa:

```txt
se buscaba mall, pero la clasificación usa normalized_location
```

Corrección:

```txt
usar normalized_location como agrupador
```

---

## 12. Pendientes inmediatos

1. Ajustar índice para filtrar `store_role=dealer` por defecto en rankings comerciales.
2. Excluir ubicaciones con `stores_count=0` del índice global.
3. Compactar `top` en `compare-all` para no exponer `place_id` si no es necesario.
4. Crear endpoint separado de evidencia:

```txt
GET /api/evidence?place_id=...&date=2026-05-14&limit=5
```

5. Documentar contrato final del agente.
6. Agregar protección para evitar capturas con reviews repetidas accidentalmente.

---

## 13. Principio rector

La mejor solución es la más simple.

En este proyecto eso significa:

```txt
capturar una vez
persistir
indexar
consultar índices
```

No calcular todo en runtime.
No consultar Google desde el agente.
No resolver por casuística cuando corresponde diseñar el índice correcto.
