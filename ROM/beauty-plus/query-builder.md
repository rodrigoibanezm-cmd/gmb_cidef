# Query Builder — Beauty Plus

## Objetivo

Convertir preguntas del usuario en llamadas válidas a routeBeautyPlusIntent.

Este archivo define planificación, selección de intent y fallback de consulta.

No define tono final.
No define narrativa.
No reemplaza instrucciones.md.

## Defaults obligatorios

Siempre usar tenant_id = beauty_plus.

Defaults del agente Beauty Plus:

- ownership_group = own
- store_role = store
- shape = compact
- valid_only = true implícito

Estos defaults mantienen el foco en tiendas Beauty Plus salvo que el usuario pida explícitamente competencia o mercado.

## Intents válidos

- ranking
- gap
- temporal
- evidence
- action
- cause

## Regla general de consulta

Primero construir JSON.
Luego llamar backend.
Luego interpretar.
Luego responder.

No responder desde memoria.
No inventar locations, fechas, competidores ni métricas.

## Action

Usar intent = action cuando el usuario pregunte:

- ¿Qué hago mañana?
- ¿Qué tienda priorizo?
- ¿Dónde intervenir?
- ¿Tengo alguna emergencia?
- ¿Qué tienda requiere intervención más urgente?

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

## Fallback si action viene vacío

Si intent = action devuelve rows vacíos o no entrega una tienda accionable, no concluir inmediatamente que faltan datos.

Antes de responder falta de datos, intentar en este orden:

1. intent = gap
2. intent = evidence
3. intent = cause

Usar siempre:

- tenant_id = beauty_plus
- filters.ownership_group = own
- filters.store_role = store
- output.shape = compact
- output.include_evidence = true cuando aplique
- output.max_rows = 3

Si después de esos intentos no hay filas ni evidencia útil, recién decir que no hay datos suficientes.

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
- output.include_evidence = true
- output.evidence_per_row = 3
- output.max_rows = 3
- output.sort = desc

## Evidence

Usar intent = evidence cuando el usuario pregunte:

- ¿Qué dicen las reviews?
- Dame evidencia.
- Muéstrame reseñas.
- ¿Hay reclamos graves?

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

- el backend entrega evidencia
- el LLM interpreta patrones
- no afirmar causalidad absoluta

## Temporal

Usar intent = temporal cuando el usuario pregunte:

- ¿Qué empeoró?
- ¿Qué cayó más?
- ¿Qué cambió desde la medición anterior?

Temporal requiere date_from y date_to.

Si el usuario no entrega fechas:

- no inventar fechas
- pedir el rango temporal necesario
- no llamar temporal incompleto

Parámetros recomendados:

- tenant_id = beauty_plus
- intent = temporal
- date_from = YYYY-MM-DD
- date_to = YYYY-MM-DD
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
