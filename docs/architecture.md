# Arquitectura

## Principio central

```txt
Google Places se usa solo para captura.
El agente nunca consulta Google Places en runtime.
```

Arquitectura actual:

```txt
Neon/Postgres = catálogo maestro + métricas runtime.
Upstash/Redis = evidencia cruda + índices legacy/fallback.
gmb_cidef = runtime/agente.
gmb_cidef_ops = captura/backfill/index/admin.
Backend = cálculo determinístico.
LLM = semántica y narrativa.
```

## Flujo runtime correcto

```txt
1. agent/router o query/compare recibe tenant + filtros.
2. Backend normaliza contrato.
3. Backend lee places + place_daily_metrics desde Neon.
4. Backend calcula ranking/gap/agregados.
5. Backend aplica shape si corresponde.
6. Backend devuelve JSON.
7. LLM interpreta y redacta.
```

Redis no es el runtime principal.

Redis queda para:

```txt
evidencia textual cruda
reviews
snapshots históricos
índices legacy/fallback
```

## Flujo operativo separado

```txt
1. gmb_cidef_ops captura Google Places.
2. gmb_cidef_ops guarda snapshots/reviews en Redis.
3. gmb_cidef_ops hace backfill a Neon place_daily_metrics.
4. gmb_cidef usa Neon para responder preguntas.
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

El backend debe:

```txt
recibir una query estructurada
validar contrato
resolver tenant y universo operativo
consultar métricas persistidas
calcular métricas
aplicar forma de respuesta solicitada: raw | compact
```

El LLM debe:

```txt
entender la pregunta
clasificar intención
pedir la forma de respuesta necesaria
interpretar evidencia
definir causa, prioridad y acción cuando corresponda
redactar la salida ejecutiva
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

El LLM nunca debe construir keys Redis.

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

## Normalización actual

Ownership normalizado:

```txt
own
competitor
```

Nota:

```txt
Para multi-tenant real, ownership/own_values/defaults deben salir de client_config.
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
runtime principal en Neon
captura separada en ops
Redis solo para evidencia/fallback legacy
cálculo determinístico en backend
```

No Google en runtime.
No SQL libre expuesto al LLM.
No endpoints ad hoc por pregunta.
No hardcodear clientes dentro del motor.
