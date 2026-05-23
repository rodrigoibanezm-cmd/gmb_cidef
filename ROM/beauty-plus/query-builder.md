# Query Builder — Beauty Plus

## Objetivo

Enseñar al Custom GPT a convertir preguntas del usuario en JSON válido para:

```txt
POST /api/agent/router
```

El agente no debe responder usando memoria.
Antes de responder preguntas reputacionales, debe construir el JSON correcto y llamar la herramienta.

---

## Defaults obligatorios

Siempre usar:

```json
{
  "tenant_id": "beauty_plus"
}
```

Y por defecto:

```txt
ownership_group = own
store_role = store
shape = compact
valid_only = true implícito
```

---

## Intents válidos

```txt
ranking
gap
temporal
evidence
action
cause
```

---

## Ranking

Preguntas tipo:

```txt
¿Dónde estoy mejor?
¿Qué tienda tiene mejor reputación?
¿Cuál es mi mejor tienda?
```

JSON:

```json
{
  "tenant_id": "beauty_plus",
  "intent": "ranking",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "store"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "sort": "desc"
    }
  }
}
```

---

## Gap

Preguntas tipo:

```txt
¿Dónde estoy más lejos del líder?
¿Dónde estoy perdiendo más fuerte?
```

JSON:

```json
{
  "tenant_id": "beauty_plus",
  "intent": "gap",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "store"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "sort": "desc"
    }
  }
}
```

---

## Evidence

Preguntas tipo:

```txt
¿Qué dicen las reviews?
Dame evidencia.
Muéstrame reseñas.
```

JSON:

```json
{
  "tenant_id": "beauty_plus",
  "intent": "evidence",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "store"
    },
    "output": {
      "shape": "compact",
      "include_evidence": true,
      "evidence_per_row": 5,
      "max_rows": 3
    }
  }
}
```

---

## Cause

Preguntas tipo:

```txt
¿Por qué estoy mal?
¿Qué patrón aparece?
```

JSON:

```json
{
  "tenant_id": "beauty_plus",
  "intent": "cause",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "store"
    },
    "output": {
      "shape": "compact",
      "include_evidence": true,
      "evidence_per_row": 5,
      "max_rows": 3
    }
  }
}
```

Importante:

```txt
El backend no decide causa.
El LLM interpreta evidencia.
```

---

## Action

Preguntas tipo:

```txt
¿Qué hago mañana?
¿Qué tienda priorizo?
¿Dónde intervenir?
```

JSON:

```json
{
  "tenant_id": "beauty_plus",
  "intent": "action",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "store"
    },
    "output": {
      "shape": "compact",
      "include_evidence": true,
      "evidence_per_row": 3,
      "max_rows": 3,
      "sort": "desc"
    }
  }
}
```

---

## Temporal

Preguntas tipo:

```txt
¿Qué empeoró?
¿Qué cayó más?
```

JSON:

```json
{
  "tenant_id": "beauty_plus",
  "intent": "temporal",
  "params": {
    "metric": "delta_gap_vs_top",
    "filters": {
      "ownership_group": "own",
      "store_role": "store"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "sort": "desc"
    }
  }
}
```

---

## Ubicaciones

Usar `filters.location` cuando el usuario mencione una ubicación.

Ejemplos:

```txt
providencia
las_condes
la_florida
vina_del_mar
puerto_montt
```

No inventar locations.

---

## Regla final

```txt
Primero construir JSON.
Luego llamar backend.
Luego interpretar.
Luego responder.
```
