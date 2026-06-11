# MCP PressureBoard Audit Map

## Objetivo

Auditar el runtime Neon-only y el flujo PressureBoard sin confundirse con legacy Redis/Sheet.

La auditoría debe partir desde datos reales en Neon y luego revisar código. No al revés.

## Repos involucradas

Runtime:

rodrigoibanezm-cmd/gmb_cidef

Ops / write-path:

rodrigoibanezm-cmd/gmb_cidef_ops

## Paso 0 — Barrido real de Neon

Antes de revisar código, correr conteos reales por tenant.

Tenants:

- cidef
- sodimac
- beauty_plus

### Places activas

    select tenant_id, count(*)
    from places
    where tenant_id in ('cidef','sodimac','beauty_plus')
      and status = 'keep'
    group by tenant_id;

### Última captura de métricas

    with latest as (
      select tenant_id, max(captured_date) as max_date
      from place_daily_metrics
      where tenant_id in ('cidef','sodimac','beauty_plus')
      group by tenant_id
    )
    select m.tenant_id, l.max_date, count(*)
    from place_daily_metrics m
    join latest l
      on l.tenant_id = m.tenant_id
     and l.max_date = m.captured_date
    group by m.tenant_id, l.max_date;

### Reviews

    select tenant_id, count(*)
    from place_reviews
    where tenant_id in ('cidef','sodimac','beauty_plus')
    group by tenant_id;

### Clasificaciones

    select tenant_id, count(*)
    from review_classifications
    where tenant_id in ('cidef','sodimac','beauty_plus')
    group by tenant_id;

### Operational cards

    with latest as (
      select tenant_id, max(card_date) as max_date
      from operational_cards
      where tenant_id in ('cidef','sodimac','beauty_plus')
      group by tenant_id
    )
    select c.tenant_id, l.max_date, count(*)
    from operational_cards c
    join latest l
      on l.tenant_id = c.tenant_id
     and l.max_date = c.card_date
    group by c.tenant_id, l.max_date;

## Output esperado

Columnas esperadas:

- tenant_id
- places_keep
- latest_metrics_date
- latest_metrics_count
- reviews
- classifications
- latest_cards_date
- cards_count

## Interpretación rápida

Si reviews > 0 y classifications = 0:

Falta clasificación.

Si classifications > 0 y cards = 0:

Falta rebuildOperationalCards.

Si cards > 0:

Dashboard debería poblar.

Si metrics = 0:

Problema de captura/base operativa.

## Rutas vivas Runtime

- POST /api/agent/router
- POST /api/query/compare
- GET /api/dashboard
- GET|POST /api/reviews/classify-missing

Nota:

/api/reviews/classify-missing en runtime es proxy a gmb_cidef_ops.

## Tablas vivas

- places
- place_daily_metrics
- place_reviews
- review_classifications
- operational_cards

## Mapa de motores

### ranking / gap / temporal

Lee:

- places
- place_daily_metrics

No mira reviews.

### review_count

Lee:

- place_reviews
- review_classifications

Devuelve conteos por:

- sentiment
- severity
- topic
- risk_type

También devuelve evidencia enriquecida con clasificación.

### evidence / action / cause

Lee:

- place_reviews

Problema a auditar:

Hoy getReviewEvidence trae evidencia cruda. No hace join con review_classifications.

Revisar si debería incorporar:

- sentiment
- topic
- severity
- risk_type
- summary
- evidence_excerpt

### dashboard

Lee:

- operational_cards

No genera cards.

### classify-missing

En runtime:

- proxy

En ops:

- pending
- commit
- rebuildOperationalCards

## Ignorar legacy

No considerar durante la auditoría:

- api/classify/*
- api/gmb/debug/classified-sample.js
- api/gmb/query/neon-test.js
- lib/upstash.js
- lib/sheetCsv.js
- lib/gmb/compareFromSnapshot.js
- lib/gmb/indexBuilder.js
- lib/gmb/locationIndexes.js
- lib/gmb/placesSource.js
- config/classification_schema.json
- data/classified.json

Ese flujo pertenece al modelo viejo:

Sheet → clasificación → Redis hash

No es parte del runtime Neon-only actual.

## Preguntas de auditoría

### 1. Tenant

¿Qué ocurre si tenant_id viene vacío, mal escrito o como "autos"?

Verificar comportamiento real de:

- /api/agent/router
- /api/query/compare

Debe quedar claro si:

- falla explícitamente
- normaliza de forma controlada
- puede devolver algo engañoso

### 2. Redis / Upstash

¿Existe alguna dependencia viva a Redis o Upstash?

Distinguir:

- dependencia viva
- archivo legacy muerto

### 3. Evidencia

¿review_count y getReviewEvidence devuelven evidencia consistente?

Especialmente:

¿getReviewEvidence debería hacer join con review_classifications?

### 4. Operational cards por tenant

¿operational_cards tiene filas para cidef, sodimac y beauty_plus?

No responder desde código. Responder con conteos reales en Neon.

### 5. Dashboard

¿/api/dashboard devuelve cards reales para cada tenant?

Si devuelve cero, identificar causa:

- falta reviews
- falta clasificación
- falta rebuild
- falta operational_cards

### 6. classify-missing

¿classify-missing debería moverse a cron/admin trigger en gmb_cidef_ops?

No debería depender del flujo conversacional del agente.

Cuidado:

Si se saca sin reemplazo, las clasificaciones se congelan.

La conclusión esperada no es solo "sacarlo", sino:

Moverlo de flujo silencioso a trigger on-demand/admin/cron.

### 7. rebuildOperationalCards

¿rebuildOperationalCards es auditable?

Cada card debe poder trazarse a:

- reviews
- review_classifications
- tenant_id
- place_id
- card_date

### 8. Datos disponibles para score

Auditar qué existe hoy para construir score:

- rating
- review_text
- review_date
- place_id
- tenant_id
- author
- language
- sentiment
- topic
- severity
- risk_type
- requires_alert
- needs_human_review
- summary
- evidence_excerpt

### 9. Datos faltantes

¿Qué datos faltan realmente para mejorar score?

No proponer variables nuevas sin justificar con evidencia de la auditoría.

## Regla de refactor

Si un archivo supera 120 líneas, revisar si mezcla responsabilidades.

No refactorizar automáticamente solo por largo.

Separar solo cuando mezcle responsabilidades claras:

- endpoint
- query
- scoring
- shape
- validación
- IO externo

Si un archivo es largo pero cohesivo, dejarlo.

## Prioridad de trabajo

1. Barrido real Neon.
2. Verificar operational_cards por tenant.
3. Verificar review_classifications por tenant.
4. Verificar si falta rebuildOperationalCards.
5. Revisar classify-missing y moverlo a flujo admin/on-demand si corresponde.
6. Revisar getReviewEvidence y posible join con review_classifications.
7. Recién después discutir score y taxonomía.

## Criterio general

Primero datos reales.

Después código.

Después scoring.

No diseñar variables nuevas sin saber:

- qué datos hay
- qué datos faltan
- qué motor está vivo
- qué tenant está realmente poblado
- dónde se corta la cadena
