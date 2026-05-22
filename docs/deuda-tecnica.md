# Deuda técnica

Este documento registra deuda técnica real del sistema.

No es backlog de ideas.
No es diseño pendiente.
No es roadmap comercial.

## Estado actual

Neon ya es default runtime.

Resuelto:

```txt
/api/query/compare usa Neon por default
/api/agent/router usa Neon
Redis queda como fallback explícito con ?engine=redis
shape=compact soporta agregados
captura/backfill/index viven en gmb_cidef_ops
```

## Prioridad actual

```txt
1. client_config / tenant ownership
2. limpiar endpoints legacy
3. limpiar geografía CIDEF
4. backfill por lotes en ops
5. temporal avanzado
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

## 2. Endpoints legacy mezclados con endpoints nuevos

Estado:

```txt
DEUDA TÉCNICA
```

Problema:

```txt
conviven endpoints legacy de compare con el nuevo agent router y query engine
```

Impacto:

```txt
confusión operativa
riesgo de usar endpoints viejos por error
```

Endpoints legacy:

```txt
GET /api/compare-all
GET /api/compare
```

Acción sugerida:

```txt
marcarlos como deprecated
moverlos explícitamente a legacy/debug
o eliminarlos si ya no tienen uso operativo
```

## 3. Geografía CIDEF incompleta

Estado:

```txt
DEUDA DE CATÁLOGO
```

Problema:

```txt
CIDEF consulta bien por marca/rating, pero todavía tiene region=unknown y market_group demasiado granular en varios places
```

Impacto:

```txt
preguntas por ciudad/región quedan débiles para CIDEF
```

Acción sugerida:

```txt
normalizar normalized_location, market_group y region para CIDEF igual que se hizo con Sodimac
```

## 4. Backfill por lotes en ops

Estado:

```txt
DEUDA OPERATIVA
```

Problema:

```txt
CIDEF tiene 727 places y el backfill completo puede demorarse
```

Impacto:

```txt
riesgo de timeout o latencia alta en Vercel
```

Acción sugerida:

```txt
agregar limit y offset a /api/admin/backfill/place-daily-metrics en gmb_cidef_ops
```

## 5. Temporal lento y limitado

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

## 6. Mezcla histórica de keys de reviews

Estado:

```txt
DEUDA TÉCNICA
```

Problema:

```txt
puede existir mezcla histórica de keys viejas y nuevas para reviews/evidencia
```

Modelo deseado:

```txt
gmb:review:{place_id}:{review_hash}
gmb:review_seen:{date}:{place_id}:{review_hash}
```

Acción sugerida:

```txt
migrar o limpiar keys históricas cuando el modelo esté estable
```

## 7. Shape minimal

Estado:

```txt
NO HACER TODAVÍA
```

Contexto:

```txt
shape=compact ya fue corregido para agregados y no hay dolor real suficiente
```
