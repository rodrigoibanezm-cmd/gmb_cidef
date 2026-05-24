# Arquitectura

## Principio central

```txt
Google Places se usa solo para captura.
El agente nunca consulta Google Places en runtime.
```

Arquitectura actual:

```txt
Neon/Postgres = catálogo maestro + métricas + evidencia runtime.
gmb_cidef = runtime/agente.
gmb_cidef_ops = captura/admin.
Backend = cálculo determinístico.
LLM = semántica y narrativa.
```

## Flujo runtime correcto

```txt
1. agent/router o query/compare recibe tenant + filtros.
2. Backend normaliza contrato.
3. Backend lee places + place_daily_metrics + place_reviews desde Neon.
4. Backend calcula ranking/gap/agregados.
5. Backend aplica shape si corresponde.
6. Backend devuelve JSON.
7. LLM interpreta y redacta.
```

## Flujo operativo separado

```txt
1. gmb_cidef_ops captura Google Places.
2. gmb_cidef_ops guarda snapshots/reviews en Neon.
3. gmb_cidef usa Neon para responder preguntas.
```

## Frontera LLM / backend

```txt
LLM = semántica in/out.
Backend = datos, rutas, contratos, cálculos, evidencia y forma del JSON.
```

El backend no debe pensar, clasificar semánticamente ni escribir respuestas ejecutivas.

Importante:

```txt
Backend = forma del JSON.
LLM = forma narrativa.
```

## Reglas clave

```txt
El LLM decide intención.
El LLM decide semántica.
El LLM pide output.shape.
El backend decide rutas y filtros.
El backend calcula métricas.
El backend da forma al JSON.
```

El backend nunca debe decidir:

```txt
causa
prioridad
action/recomendación ejecutiva
sentimiento semántico
```

## Multi-tenant actual

La resolución runtime parte desde Neon:

```txt
places
place_daily_metrics
place_reviews
```

Filtros actuales:

```txt
tenant_id
industry
normalized_location
market_group
region
store_role
ownership_group
brand
status=keep
```

## Modelo de ubicación

```txt
normalized_location = comuna / unidad mínima comparable
market_group = ciudad / zona mayor
region = región
```

## Principio rector

```txt
La mejor solución es la más simple.
```

Para esta etapa:

```txt
runtime Neon-only
captura separada en ops
sin Redis/Upstash
cálculo determinístico en backend
```

No Google en runtime.
No SQL libre expuesto al LLM.
No endpoints ad hoc por pregunta.
No hardcodear clientes dentro del motor.
