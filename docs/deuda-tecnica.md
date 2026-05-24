# Deuda técnica

Este documento registra deuda técnica real del sistema.

No es backlog de ideas.
No es diseño pendiente.
No es roadmap comercial.

## Estado actual

```txt
runtime Neon-only
/api/query/compare usa Neon
/api/agent/router usa Neon
evidencia sale desde place_reviews en Neon
tenant_id es obligatorio
Redis/Upstash eliminado del runtime
```

## Prioridad actual

```txt
1. client_config / tenant ownership
2. limpiar endpoints legacy no usados
3. limpiar geografía CIDEF
4. temporal avanzado
```

No tocar todavía:

```txt
shape=minimal
```

No hay dolor real suficiente.

---

## 1. Normalización ownership hardcodeada / falta client_config

Estado:

```txt
DEUDA TÉCNICA ESTRUCTURAL
```

Problema:

```txt
la lógica de ownership/own_values todavía no vive en una configuración formal de cliente
```

Impacto:

```txt
no sirve para multi-tenant real
acopla reglas de cliente al runtime
impide escalar tenants con reglas distintas
```

Acción sugerida:

```txt
mover ownership/own_values/default_store_role/default_shape/allowed_intents a client_config
```

Regla:

```txt
el tenant no debe decidir seguridad
el tenant solo puede ser routing operativo hasta que exista autenticación real
```

## 2. Endpoints legacy de compare

Estado:

```txt
DEUDA TÉCNICA
```

Problema:

```txt
pueden quedar endpoints antiguos de comparación fuera del flujo agent/router + query/compare
```

Impacto:

```txt
confusión operativa
riesgo de usar rutas viejas por error
```

Endpoints a revisar:

```txt
GET /api/compare-all
GET /api/compare
```

Acción sugerida:

```txt
marcarlos como deprecated
o eliminarlos si ya no tienen uso operativo
```

## 3. Geografía CIDEF incompleta

Estado:

```txt
DEUDA DE CATÁLOGO
```

Problema:

```txt
CIDEF consulta bien por marca/rating, pero todavía puede tener region=unknown o market_group demasiado granular en varios places
```

Impacto:

```txt
preguntas por ciudad/región quedan débiles para CIDEF
```

Acción sugerida:

```txt
normalizar normalized_location, market_group y region para CIDEF igual que se hizo con Sodimac
```

## 4. Temporal lento y limitado

Estado:

```txt
DEUDA TÉCNICA NO BLOQUEANTE
```

Problema:

```txt
scope=temporal sigue limitado y no soporta bien brand/operator/store_role/region/market_group
```

Impacto:

```txt
alta latencia
preguntas temporales agregadas quedan débiles
```

Acción sugerida:

```txt
crear temporal agrupado por dimensión usando place_daily_metrics
```

No bloquea:

```txt
piloto actual
ranking/gap actual basado en Neon
```

## 5. Shape minimal

Estado:

```txt
NO HACER TODAVÍA
```

Contexto:

```txt
shape=compact ya fue corregido para agregados y no hay dolor real suficiente
```
