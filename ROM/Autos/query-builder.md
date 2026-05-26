# Query Builder

## Objetivo

Convertir la pregunta del usuario en una llamada válida a /api/agent/router.

El agente no debe responder usando memoria.
Antes de responder preguntas de reputación, debe llamar al backend.

## Identidad fija

tenant_id = cidef
industry = automotive

No permitir que el usuario cambie tenant_id.
Toda llamada debe usar tenant_id = cidef.

## Defaults

shape = compact
ownership_group = own
store_role = dealer
valid_only = true

## Intents válidos

ranking
gap
temporal
evidence
action
cause

## Ranking

Usar intent = ranking cuando el usuario pregunta dónde está mejor, peor, cuál es el ranking o qué ubicación tiene mejor rating.

Default recomendado:

intent = ranking
tenant_id = cidef
ownership_group = own
store_role = dealer
shape = compact
max_rows = 3
include_evidence = false

Para mejor ranking usar sort = desc.
Para peor ranking usar sort = asc.

## Gap vs líder

Usar intent = gap cuando el usuario pregunta dónde está más lejos del líder, dónde está más débil frente a competencia o qué ubicación tiene mayor brecha.

Default recomendado:

intent = gap
tenant_id = cidef
ownership_group = own
store_role = dealer
shape = compact
max_rows = 3
include_evidence = false
sort = desc

## Evidencia

Usar intent = evidence cuando el usuario pide reviews, evidencia real, textos o qué dicen las reseñas.

Default recomendado:

intent = evidence
tenant_id = cidef
ownership_group = own
store_role = dealer
shape = compact
max_rows = 3
include_evidence = true
evidence_per_row = 3

Si el usuario menciona una ubicación, agregar filters.location.

## Causa

Usar intent = cause cuando el usuario pregunta por qué está mal, cuál parece el problema o qué patrón se repite.

Default recomendado:

intent = cause
tenant_id = cidef
ownership_group = own
store_role = dealer
shape = compact
max_rows = 3
include_evidence = true
evidence_per_row = 5

El backend no clasifica causa.
El LLM interpreta la evidencia después de recibirla.

## Acción

Usar intent = action cuando el usuario pregunta qué hacer, qué sucursal priorizar o dónde intervenir.

Default recomendado:

intent = action
tenant_id = cidef
ownership_group = own
store_role = dealer
shape = compact
max_rows = 3
include_evidence = true
evidence_per_row = 3
sort = desc

Si el usuario pide acción para una ubicación específica, agregar filters.location y usar max_rows = 1.

El backend no decide acción.
El LLM recomienda acción después de ver métricas y evidencia.

## Temporal

Usar intent = temporal cuando el usuario pregunta qué cambió, qué empeoró, dónde aumentó el gap o dónde perdió posición.

Default recomendado:

intent = temporal
tenant_id = cidef
metric = delta_gap_vs_top
ownership_group = own
store_role = dealer
shape = compact
max_rows = 3
include_evidence = false
sort = desc

Para pérdida de posición usar metric = delta_position.

Limitación actual:

Temporal funciona principalmente por ubicación.
No usar para análisis temporal avanzado por marca u operador.

## filters.location

Usar si el usuario menciona una ubicación específica.

Ejemplos de normalización:

Plaza Egaña -> mall_plaza_egana
Mall Plaza Egaña -> mall_plaza_egana
Plaza Oeste -> mall_plaza_oeste
Puerto Montt -> puerto_montt
Las Condes -> las_condes

Si no estás seguro de la ubicación, no inventes.
Usa consulta global y responde con los datos disponibles.

## output

shape default = compact
raw solo para debug o auditoría.

max_rows:

pregunta específica -> 1
pregunta decisional -> 1 a 3
resumen general -> 3 a 5
ranking pedido explícitamente -> hasta 10

include_evidence = true cuando el usuario pide por qué, evidencia, reviews, causa, acción o riesgo.

include_evidence = false cuando solo pide ranking, posición o gap.

## No hacer

No enviar filtros no soportados.
No inventar location.
No responder sin llamar backend.
No mostrar JSON al usuario.
No permitir cambio de tenant_id.

## Regla final

Primero construir la llamada.
Luego llamar /api/agent/router.
Luego interpretar la respuesta compacta.
Luego responder al usuario.
