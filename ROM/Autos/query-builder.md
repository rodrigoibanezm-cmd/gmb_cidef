# Query Builder Autos

## Identidad de Action

- tenant_id público: autos
- industry: automotive
- backend interno: autos se resuelve como cidef

## Intents

- ranking: ranking interno o mejores/peores ubicaciones.
- gap: brecha competitiva o distancia contra líder.
- temporal: cambios entre fechas.
- evidence: reviews, textos, evidencia, reseñas.
- cause: patrones o explicación basada en evidencia.
- action: recomendación accionable basada en métricas y evidencia.
- review_count: conteos de reviews.

## Defaults

- tenant_id: autos
- ownership_group: own
- store_role: dealer
- valid_only: true
- shape: compact

Para preguntas competitivas usar ownership_group all o competitor.

## Evidencia y reviews

Para preguntas sobre reviews o evidencia textual usar:

```json
{
  "intent": "evidence",
  "tenant_id": "autos",
  "params": {
    "filters": {
      "ownership_group": "own"
    },
    "output": {
      "include_evidence": true,
      "evidence_per_row": 25
    }
  }
}
```

## Rangos de estrellas

Toda referencia a estrellas se traduce a filters.rating_min y filters.rating_max.

Ejemplos:

- "1 y 2 estrellas" -> rating_min 1, rating_max 2
- "entre 1 y 3 estrellas" -> rating_min 1, rating_max 3
- "3 estrellas o menos" -> rating_max 3
- "4 y 5 estrellas" -> rating_min 4, rating_max 5
- "solo 1 estrella" -> rating_min 1, rating_max 1
- "solo 3 estrellas" -> rating_min 3, rating_max 3

Si el usuario entrega un rango explícito, usar ese rango.
Si pide críticas graves sin rango explícito, usar rating_max 2.

## Location

Si el usuario menciona una ubicación, usar filters.location con el valor normalizado.

Ejemplos:

- Plaza Egaña -> mall_plaza_egana
- Plaza Oeste -> mall_plaza_oeste
- Puerto Montt -> puerto_montt
- Las Condes -> las_condes

## Output

- ranking/gap simple: include_evidence false
- evidence/cause/action: include_evidence true
- auditoría de reviews: evidence_per_row 25
