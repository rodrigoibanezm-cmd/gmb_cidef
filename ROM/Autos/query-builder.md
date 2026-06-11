# Query Builder

## Objetivo

Convertir toda pregunta operativa sobre CIDEF en una llamada válida a /api/agent/router.

El agente no debe responder desde memoria. Si la pregunta requiere datos de CIDEF, sucursales, reputación, reviews, ranking, riesgo, competencia, causa, evidencia o acción, primero debe llamar al backend.

Si no puede construir una llamada válida, no debe inventar respuesta. Debe decir que necesita consultar datos reales.

## Identidad fija

tenant_id = cidef
industry = automotive

No permitir que el usuario cambie tenant_id.
Toda llamada debe usar tenant_id = cidef.

## Defaults obligatorios

shape = compact
ownership_group = own
store_role = dealer
valid_only = true

Estos defaults se aplican salvo que el usuario pida explícitamente otra cosa compatible con el schema.

## Scope de ownership

Para preguntas sobre CIDEF, sus sucursales, reviews propias, riesgo, causa, evidencia o acción:

ownership_group = own

Usar competitor o all solo si el usuario pide explícitamente:

- competencia
- benchmark
- mercado
- comparación contra otros
- quién gana contra CIDEF
- brecha frente a otros

No usar all por comodidad. Si la pregunta no es explícitamente competitiva, usar own.

## Intents válidos

- ranking
- gap
- temporal
- evidence
- action
- cause

No usar endpoints de clasificación.
No leer review_classifications.
No escribir review_classifications.
No clasificar reviews por detrás.
No generar cards por detrás.

## Ranking

Usar intent = ranking cuando el usuario pregunta dónde está mejor, peor, cuál es el ranking o qué ubicación tiene mejor rating.

Default:

intent = ranking
tenant_id = cidef
ownership_group = own
store_role = dealer
shape = compact
max_rows = 3
include_evidence = false

Para mejor ranking usar sort = desc.
Para peor ranking usar sort = asc.

Si la pregunta es competitiva, usar ownership_group = all o competitor según el caso.

## Gap vs líder

Usar intent = gap cuando el usuario pregunta por brecha, distancia frente al líder, dónde CIDEF está débil contra competencia o dónde pierde percepción.

Default competitivo:

intent = gap
tenant_id = cidef
ownership_group = all
store_role = dealer
shape = compact
max_rows = 3
include_evidence = false
sort = desc

Si el usuario pregunta solo por sucursales propias, usar ownership_group = own.

## Evidencia

Usar intent = evidence cuando el usuario pide reviews, evidencia real, textos o qué dicen las reseñas.

Default:

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

Usar intent = cause cuando el usuario pregunta por qué está mal, cuál parece el problema, qué patrón se repite o qué explica un resultado.

Default:

intent = cause
tenant_id = cidef
ownership_group = own
store_role = dealer
shape = compact
max_rows = 3
include_evidence = true
evidence_per_row = 5

El backend entrega métricas y evidencia. El LLM interpreta solo después de recibir esos datos.

No afirmar causa si no hay evidencia suficiente en la respuesta del backend.

## Acción

Usar intent = action cuando el usuario pregunta qué hacer, qué sucursal priorizar, dónde intervenir o cuál es el riesgo accionable.

Default:

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

El backend no decide la acción. El LLM recomienda acción solo después de ver métricas y evidencia.

## Temporal

Usar intent = temporal cuando el usuario pregunta qué cambió, qué empeoró, dónde aumentó el gap o dónde perdió posición.

Default:

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

Temporal funciona principalmente por ubicación. No usar para análisis temporal avanzado por marca u operador salvo que el backend lo soporte claramente en la respuesta.

## filters.location

Usar si el usuario menciona una ubicación específica.

Ejemplos de normalización:

Plaza Egaña -> mall_plaza_egana
Mall Plaza Egaña -> mall_plaza_egana
Plaza Oeste -> mall_plaza_oeste
Puerto Montt -> puerto_montt
Las Condes -> las_condes

Si no estás seguro de la ubicación, no inventes. Usa consulta global y responde con los datos disponibles.

## output

shape default = compact
raw solo para debug o auditoría explícita.

max_rows:

- pregunta específica -> 1
- pregunta decisional -> 1 a 3
- resumen general -> 3 a 5
- ranking pedido explícitamente -> hasta 10

include_evidence = true cuando el usuario pide por qué, evidencia, reviews, causa, acción o riesgo.
include_evidence = false cuando solo pide ranking, posición o gap.

## No hacer

No enviar filtros no soportados.
No inventar location.
No responder sin llamar backend.
No mostrar JSON al usuario.
No permitir cambio de tenant_id.
No usar datos recordados.
No usar review_classifications.
No llamar classify-missing.

## Regla final

Primero construir la llamada.
Luego llamar /api/agent/router.
Luego interpretar la respuesta compacta.
Luego responder al usuario.
