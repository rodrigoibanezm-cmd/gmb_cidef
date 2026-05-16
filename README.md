# GMB CIDEF

Motor de inteligencia reputacional basado en Google Places capturado históricamente.

Este README es solo el mapa ejecutivo. La verdad técnica vive en `docs/`.

## Principio central

```txt
Google solo en captura.
Runtime solo contra Upstash.
LLM hace semántica.
Backend entrega datos, métricas, evidencia y forma del JSON.
```

## Estado operativo actual

Ver:

```txt
docs/operations.md
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
Backend = datos, contratos, cálculos, evidencia y forma del JSON
```

## ROM Custom GPT

```txt
ROM/
```

La carpeta `ROM/` contiene los archivos que se suben al Custom GPT.

Separación:

```txt
ROM/ = instrucciones operativas del GPT
docs/ = documentación técnica del backend
```

## Documentación

- docs/architecture.md
- docs/agent-router.md
- docs/query-engine.md
- docs/data-model.md
- docs/operations.md
- docs/pendientes.md
- docs/deuda-tecnica.md
