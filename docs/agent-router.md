# Agent Router

## Endpoint principal

```txt
POST /api/agent/router
```

El LLM entra siempre por este endpoint.

El router:

```txt
valida intent
aplica defaults
construye compare_query
llama queryExecutor
aplica output.shape
```

## Archivo principal

```txt
lib/gmb/agentRouter.js
```

## Intents actuales

```txt
ranking
gap
temporal
evidence
action
cause
```

## Reglas del router

```txt
ranking -> compare_query con default ownership_group="own"
gap -> compare_query con default metric="gap_vs_top"
temporal -> compare_query con scope="temporal"
evidence -> compare_query con include_evidence=true
action -> compare_query con semantic_required=true
cause -> compare_query con include_evidence=true y semantic_required=true
```

`action` y `cause` no deciden nada en backend.

Importante:

```txt
action/cause son intents de preparación de evidencia, no intents de decisión.
```

Solo entregan datos suficientes para que el LLM interprete.

## Payload ejemplo

```json
{
  "intent": "action",
  "params": {
    "date": "2026-05-15",
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 5,
      "include_evidence": true,
      "evidence_per_row": 2
    }
  }
}
```

## semantic_required

Regla:

```txt
semantic_required=true
```

significa:

```txt
el backend NO interpreta
el LLM debe interpretar
```

Actualmente:

```txt
action -> semantic_required=true
cause -> semantic_required=true
```

## output.shape

Formas soportadas:

```txt
raw
compact
```

### raw

Salida completa.

Uso:

```txt
debug
auditoría
desarrollo
```

### compact

Salida liviana para runtime LLM.

Uso:

```txt
agente runtime
producción
reducción de tokens
```

Si no viene `shape`:

```txt
fallback = raw
```
