# Arquitectura

## Principio central

```txt
Google Places se usa solo para captura.
El agente nunca consulta Google Places en runtime.
El agente consulta JSON generado desde Upstash e índices.
```

## Frontera LLM / backend

```txt
LLM = semántica in/out.
Backend = datos, rutas, contratos, cálculos, evidencia y forma de respuesta.
```

El backend no debe pensar, clasificar semánticamente ni escribir respuestas ejecutivas.

El backend debe:

```txt
recibir una query estructurada
validar contrato
ejecutar contra datos persistidos/indexados
devolver JSON controlado
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
Para multi-tenant real, la regla debe salir de client_config, no quedar hardcodeada.
```

## Principio rector

```txt
La mejor solución es la más simple.
```

Para esta etapa:

```txt
capturar faltantes
persistir en Upstash
validar índice
consultar con compare_query cerrado
```

No Google en runtime.
No SQL libre.
No endpoints ad hoc por cada pregunta.
No hardcodear clientes dentro del motor.
