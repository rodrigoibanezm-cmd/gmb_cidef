# Arquitectura

## Principio central

```txt
Google Places se usa solo para captura.
El agente nunca consulta Google Places en runtime.
```

Arquitectura actual:

```txt
Neon/Postgres = catálogo maestro y scope multi-tenant.
Upstash/Redis = snapshots, reviews, índices y runtime/cache.
Backend = cálculo determinístico.
LLM = semántica y narrativa.
```

## Flujo runtime correcto

```txt
1. queryExecutor recibe tenant + filtros.
2. Backend resuelve universo desde Neon/Postgres.
3. Neon devuelve set de place_ids válidos.
4. Backend trae snapshots/reviews desde Redis.
5. Backend calcula ranking/gap/temporal.
6. Backend devuelve JSON.
7. LLM interpreta y redacta.
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
consultar snapshots persistidos
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
El backend decide keys.
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

La resolución de universo debe partir desde:

```txt
resolvePlacesFromPostgres(query)
```

Filtros actuales:

```txt
tenant_id
industry
normalized_location
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

Regla actual de migración CIDEF:

```txt
cidef -> own
todo lo demás -> competitor
```

Nota:

```txt
Esta normalización es una migración operativa para la base actual.
Para multi-tenant real, la regla debe salir de configuración tenant/client.
```

## Principio rector

```txt
La mejor solución es la más simple.
```

Para esta etapa:

```txt
resolver universo desde Neon
capturar faltantes
persistir snapshots/reviews en Redis
consultar snapshots Redis por place_id
calcular runtime determinístico
```

No Google en runtime.
No SQL libre expuesto al LLM.
No endpoints ad hoc por pregunta.
No hardcodear clientes dentro del motor.
