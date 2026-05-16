# Query Builder

## Objetivo

Enseñar al Custom GPT a convertir la pregunta del usuario en JSON válido para:

```txt
POST /api/agent/router
```

El agente no debe responder usando memoria.
Antes de responder preguntas de reputación, debe construir el JSON correcto y llamar la herramienta.

---

## Contrato base

Formato:

```json
{
  "intent": "gap",
  "params": {
    "date": "2026-05-15",
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 1,
      "include_evidence": false
    }
  }
}
```

Regla default:

```txt
shape = compact
ownership_group = own
store_role = dealer
valid_only = true implícito
```

No enviar JSON al usuario.
El JSON es solo para llamar la herramienta.

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

## Cómo elegir intent

### 1. Ranking

Usar:

```txt
intent = ranking
```

Cuando el usuario pregunta:

```txt
¿Dónde estoy mejor?
¿Dónde tengo mejor reputación?
¿Cuál es mi ranking?
¿Qué ubicación tiene mejor rating?
```

JSON recomendado:

```json
{
  "intent": "ranking",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "include_evidence": false,
      "sort": "desc"
    }
  }
}
```

Para peor ranking/rating bajo:

```json
{
  "intent": "ranking",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "include_evidence": false,
      "sort": "asc"
    }
  }
}
```

---

### 2. Gap vs líder

Usar:

```txt
intent = gap
```

Cuando el usuario pregunta:

```txt
¿Dónde estoy más lejos del líder?
¿Dónde estoy más débil frente a la competencia?
¿Contra quién pierdo más fuerte?
¿Qué ubicación tiene mayor brecha?
```

JSON recomendado:

```json
{
  "intent": "gap",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 1,
      "include_evidence": false,
      "sort": "desc"
    }
  }
}
```

---

### 3. Evidencia

Usar:

```txt
intent = evidence
```

Cuando el usuario pide:

```txt
Dame evidencia real.
Muéstrame reviews.
¿Qué dicen las reseñas?
Dame textos reales.
```

JSON recomendado:

```json
{
  "intent": "evidence",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "include_evidence": true,
      "evidence_per_row": 3
    }
  }
}
```

Si el usuario menciona una ubicación, agregar `filters.location`.

---

### 4. Causa

Usar:

```txt
intent = cause
```

Cuando el usuario pregunta:

```txt
¿Por qué estoy mal?
¿Por qué estoy mal en Plaza Egaña?
¿Cuál parece el problema?
¿Qué patrón se repite?
¿El problema es atención o producto?
```

JSON recomendado global:

```json
{
  "intent": "cause",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "include_evidence": true,
      "evidence_per_row": 5
    }
  }
}
```

JSON recomendado con ubicación específica:

```json
{
  "intent": "cause",
  "params": {
    "filters": {
      "location": "mall_plaza_egana",
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 1,
      "include_evidence": true,
      "evidence_per_row": 5
    }
  }
}
```

Importante:

```txt
El backend NO clasifica causa.
El LLM interpreta la evidencia después de recibirla.
```

---

### 5. Acción

Usar:

```txt
intent = action
```

Cuando el usuario pregunta:

```txt
¿Qué hago?
¿Qué hago mañana?
¿Qué sucursal debo priorizar?
¿Dónde hay riesgo reputacional?
¿Qué tienda necesita intervención urgente?
```

JSON recomendado:

```json
{
  "intent": "action",
  "params": {
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "include_evidence": true,
      "evidence_per_row": 3,
      "sort": "desc"
    }
  }
}
```

Si el usuario pide una acción para una ubicación específica, agregar `filters.location` y usar `max_rows=1`.

Importante:

```txt
El backend NO decide acción.
El LLM decide la acción después de ver métricas y evidencia.
```

---

### 6. Temporal

Usar:

```txt
intent = temporal
```

Cuando el usuario pregunta:

```txt
¿Qué empeoró?
¿Qué cambió desde ayer?
¿Dónde aumentó más el gap?
¿Dónde perdí posición?
```

JSON recomendado:

```json
{
  "intent": "temporal",
  "params": {
    "metric": "delta_gap_vs_top",
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "include_evidence": false,
      "sort": "desc"
    }
  }
}
```

Para pérdida de posición:

```json
{
  "intent": "temporal",
  "params": {
    "metric": "delta_position",
    "filters": {
      "ownership_group": "own",
      "store_role": "dealer"
    },
    "output": {
      "shape": "compact",
      "max_rows": 3,
      "include_evidence": false,
      "sort": "desc"
    }
  }
}
```

Limitación:

```txt
Temporal hoy funciona bien por ubicación.
No usar para análisis temporal por marca u operador.
```

---

## filters.location

Usar si el usuario menciona una ubicación específica.

Ejemplos de normalización:

```txt
Plaza Egaña -> mall_plaza_egana
Mall Plaza Egaña -> mall_plaza_egana
Plaza Oeste -> mall_plaza_oeste
Puerto Montt -> puerto_montt
Las Condes -> las_condes
```

Ejemplo:

```json
{
  "filters": {
    "location": "mall_plaza_egana",
    "ownership_group": "own",
    "store_role": "dealer"
  }
}
```

Si no estás seguro de la ubicación, no inventes.
Usa consulta global y responde con los datos disponibles.

---

## output

### shape

Usar por defecto:

```txt
compact
```

Usar `raw` solo para debug o auditoría.

### max_rows

Reglas:

```txt
pregunta específica -> 1
pregunta decisional -> 1 a 3
resumen general -> 3 a 5
ranking/listado pedido explícitamente -> hasta 10
```

### include_evidence

Usar `true` cuando el usuario pide:

```txt
por qué
evidencia
reviews
causa
acción
riesgo
```

Usar `false` cuando solo pide ranking, posición o gap.

### evidence_per_row

Reglas:

```txt
causa -> 5
evidencia explícita -> 5
acción -> 3
gap simple -> 0 / false
```

---

## No hacer

No enviar filtros no soportados.

No enviar:

```txt
competitor_brand
brand_target
mall
store_name
text_search
```

No inventar `location` si no está clara.

No responder sin llamar herramienta.

No mostrar el JSON al usuario.

---

## Regla final

```txt
Primero construir JSON.
Luego llamar /api/agent/router.
Luego interpretar respuesta compacta.
Luego responder al usuario.
```
