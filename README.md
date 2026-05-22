# GMB CIDEF

Runtime del agente reputacional.

Esta repo contiene el motor de consulta y la capa que usa el Custom GPT/agente para responder preguntas.

La operación de datos vive en otra repo:

```txt
gmb_cidef_ops
```

## Responsabilidad de esta repo

```txt
agent router
query runtime
contratos de consulta
response shape
ROM Custom GPT
documentación del agente/runtime
```

## Fuera de esta repo

```txt
captura Google Places
backfill Neon
indexación Redis
endpoints admin/debug operativos
cron jobs
```

Eso vive en:

```txt
gmb_cidef_ops
```

## Principio central

```txt
LLM hace semántica.
Backend entrega datos, métricas, evidencia y forma del JSON.
Neon es el plano de decisión/runtime.
Upstash queda como evidencia cruda e índices legacy.
Google Places solo se usa en captura desde ops.
```

## Endpoint principal del agente

```txt
POST /api/agent/router
```

## Endpoint técnico de consulta

```txt
POST /api/query/compare
```

Uso recomendado:

```txt
engine=neon
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

## Modelo de ubicación

```txt
normalized_location = comuna
market_group = ciudad / zona mayor
region = región
```

Ejemplos:

```txt
normalized_location = maipu
market_group = santiago
region = metropolitana
```

```txt
normalized_location = concepcion
market_group = gran_concepcion
region = biobio
```

## ROM Custom GPT

```txt
ROM/
```

La carpeta `ROM/` contiene los archivos que se suben al Custom GPT.

Separación:

```txt
ROM/ = instrucciones operativas del GPT
docs/ = documentación técnica del backend runtime
```

## Documentación

- docs/architecture.md
- docs/agent-router.md
- docs/query-engine.md
- docs/data-model.md
- docs/operations.md
- docs/pendientes.md
- docs/deuda-tecnica.md
