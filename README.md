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
endpoints admin/debug operativos
cron jobs
carga de snapshots/reviews en Neon
```

Eso vive en:

```txt
gmb_cidef_ops
```

## Principio central

```txt
LLM hace semántica.
Backend entrega datos, métricas, evidencia y forma del JSON.
Neon/Postgres es el único plano de decisión/runtime.
Google Places solo se usa en captura desde ops.
Redis/Upstash no forma parte del runtime.
```

## Endpoint principal del agente

```txt
POST /api/agent/router
```

Estado:

```txt
usa Neon vía compare_query_neon
```

## Endpoint técnico de consulta

```txt
POST /api/query/compare
```

Reglas:

```txt
tenant_id es obligatorio
no existe engine=redis
no existe fallback Redis
```

Respuesta esperada runtime:

```txt
engine = neon
source = neon_place_daily_metrics
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

`shape=compact` soporta agregados por brand, region, market_group, store_role y operator.

## Modelo de ubicación

```txt
normalized_location = comuna
market_group = ciudad / zona mayor
region = región
```

## Estado actual

```txt
runtime Neon-only
query compare Neon-only
evidencia desde Neon place_reviews
tenant_id obligatorio
Google Places fuera del runtime
Redis/Upstash eliminado del runtime
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
