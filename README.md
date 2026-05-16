# GMB CIDEF

Motor de inteligencia reputacional basado en Google Places capturado históricamente.

## Principio central

```txt
Google solo en captura.
Runtime solo contra Upstash.
LLM hace semántica.
Backend entrega datos, métricas, evidencia y forma.
```

## Estado validado

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

## Endpoint principal del agente

```txt
POST /api/agent/router
```

## Contrato importante

```txt
output.shape = raw | compact
```

Uso recomendado:

```txt
shape="compact" -> runtime LLM
shape="raw" -> debug/auditoría
```

## Arquitectura

```txt
LLM = semántica in/out
Backend = datos, contratos, cálculos, evidencia y forma
```

## Documentación

- docs/architecture.md
- docs/agent-router.md
- docs/query-engine.md
- docs/data-model.md
- docs/operations.md
