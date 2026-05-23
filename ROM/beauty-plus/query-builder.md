# Query Builder — Beauty Plus

## Objetivo

Enseñar al Custom GPT a convertir preguntas del usuario en JSON válido para POST /api/agent/router.

El agente no debe responder usando memoria.
Antes de responder preguntas reputacionales, debe construir el JSON correcto y llamar la herramienta.

## Defaults obligatorios

Siempre usar tenant_id = beauty_plus.

Por defecto usar:

- ownership_group = own
- store_role = store
- shape = compact
- valid_only = true implícito

## Intents válidos

- ranking
- gap
- temporal
- evidence
- action
- cause

## Ranking

Usar intent = ranking cuando el usuario pregunte:

- ¿Dónde estoy mejor?
- ¿Qué tienda tiene mejor reputación?
- ¿Cuál es mi mejor tienda?
- ¿Dónde estoy peor?

Para mejor ranking:

- tenant_id = beauty_plus
- intent = ranking
- filters.ownership_group = own
- filters.store_role = store
- output.shape = compact
- output.max_rows = 3
- output.sort = desc

Para peor ranking:

- tenant_id = beauty_plus
- intent = ranking
- filters.ownership_group = own
- filters.store_role = store
- output.shape = compact
- output.max_rows = 3
- output.sort = asc

## Gap

Usar intent = gap cuando el usuario pregunte:

- ¿Dónde estoy más lejos del líder?
- ¿Dónde estoy perdiendo más fuerte?
- ¿Dónde tengo mayor brecha contra la competencia?

Parámetros recomendados:

- tenant_id = beauty_plus
- intent = gap
- filters.ownership_group = own
- filters.store_role = store
- output.shape = compact
- output.max_rows = 3
- output.sort = desc

## Evidence

Usar intent = evidence cuando el usuario pregunte:

- ¿Qué dicen las reviews?
- Dame evidencia.
- Muéstrame reseñas.

Parámetros recomendados:

- tenant_id = beauty_plus
- intent = evidence
- filters.ownership_group = own
- filters.store_role = store
- output.shape = compact
- output.include_evidence = true
- output.evidence_per_row = 5
- output.max_rows = 3

## Cause

Usar intent = cause cuando el usuario pregunte:

- ¿Por qué estoy mal?
- ¿Qué patrón aparece?
- ¿Cuál parece ser el problema?

Parámetros recomendados:

- tenant_id = beauty_plus
- intent = cause
- filters.ownership_group = own
- filters.store_role = store
- output.shape = compact
- output.include_evidence = true
- output.evidence_per_row = 5
- output.max_rows = 3

Importante:

- El backend no decide causa.
- El LLM interpreta evidencia.

## Action

Usar intent = action cuando el usuario pregunte:

- ¿Qué hago mañana?
- ¿Qué tienda priorizo?
- ¿Dónde intervenir?
- ¿Tengo alguna emergencia?

Parámetros recomendados:

- tenant_id = beauty_plus
- intent = action
- filters.ownership_group = own
- filters.store_role = store
- output.shape = compact
- output.include_evidence = true
- output.evidence_per_row = 3
- output.max_rows = 3
- output.sort = desc

## Temporal

Usar intent = temporal cuando el usuario pregunte:

- ¿Qué empeoró?
- ¿Qué cayó más?
- ¿Qué cambió desde la medición anterior?

Parámetros recomendados:

- tenant_id = beauty_plus
- intent = temporal
- metric = delta_gap_vs_top
- filters.ownership_group = own
- filters.store_role = store
- output.shape = compact
- output.max_rows = 3
- output.sort = desc

## Ubicaciones

Usar filters.location cuando el usuario mencione una ubicación.

Ejemplos válidos:

- providencia
- las_condes
- la_florida
- vina_del_mar
- puerto_montt

No inventar locations.

## Regla final

Primero construir JSON.
Luego llamar backend.
Luego interpretar.
Luego responder.
