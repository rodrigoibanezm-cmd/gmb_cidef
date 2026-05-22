# Deuda técnica

Este documento registra deuda técnica real del sistema.

No es backlog de ideas.
No es diseño pendiente.
No es roadmap comercial.

## Prioridad actual

Después de separar `runtime` y `ops`, la prioridad real cambió.

Orden actual:

```txt
1. Neon default
2. client_config / tenant ownership
3. limpiar endpoints legacy
4. fallback/index discipline
5. temporal avanzado
```

No tocar todavía:

```txt
shape=minimal
```

No hay dolor real suficiente.

---

## 1. Neon no es default todavía

Estado:

```txt
DEUDA TÉCNICA PRIORITARIA
```

Problema:

```txt
/api/query/compare y /api/agent/router todavía pueden depender de ?engine=neon para usar el motor validado.
```

Impacto:

```txt
riesgo de que runtime use motor legacy por omisión
confusión operativa
inconsistencia entre lo validado y lo usado por el agente
```

Contexto:

```txt
Neon ya fue validado con Sodimac y CIDEF.
```

Acción sugerida:

```txt
dejar engine=neon como default en /api/query/compare y /api/agent/router
mantener engine=redis solo como override explícito/debug
```

## 2. Normalización ownership hardcodeada / falta client_config

Estado:

```txt
DEUDA TÉCNICA ESTRUCTURAL
```

Problema:

```txt
la migración actual normaliza cidef -> own y el resto -> competitor
```

Impacto:

```txt
no sirve para multi-tenant real
acopla lógica de cliente al sistema
impide que el query engine siga siendo agnóstico a clientes
```

Causa:

```txt
ownership/own_values todavía no viven en una configuración de cliente
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

## 3. Endpoints legacy mezclados con endpoints nuevos

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

Nota:

```txt
después de separar runtime y ops, esta deuda bajó de prioridad
```

## 4. Índices por fecha requieren disciplina operativa / fallback

Estado:

```txt
DEUDA OPERATIVA
```

Problema:

```txt
las queries Redis/legacy dependen de índices diarios consistentes
```

Impacto:

```txt
si una fecha no está indexada o fue indexada con reglas antiguas, algunas queries devuelven rows=[]
```

Acción sugerida:

```txt
mantener build/status como paso obligatorio después de captura
considerar último índice válido como fallback futuro
```

Nota:

```txt
si Neon queda como default, el riesgo baja para runtime principal
```

## 5. Temporal lento y limitado

Estado:

```txt
DEUDA TÉCNICA NO BLOQUEANTE
```

Problema:

```txt
scope=temporal hoy compara dos fechas ejecutando lecturas por ubicación
scope=temporal funciona como primera capa por ubicación
no soporta correctamente brand/operator/store_role temporal
```

Impacto:

```txt
alta latencia
muchas lecturas Upstash
preguntas temporales por marca u operador quedan fuera o débiles
```

Causa:

```txt
no existe índice compacto temporal precomputado por fecha
executeTemporal compara summaries construidos por location
```

Acción sugerida:

```txt
crear temporal agrupado por dimensión
o reutilizar executeIntra con snapshot por fecha
```

No bloquea:

```txt
piloto actual
runtime principal basado en ranking/gap actual
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

Impacto:

```txt
complejidad en lectura de evidencia
riesgo de inconsistencias futuras
```

Acción sugerida:

```txt
migrar o limpiar keys históricas cuando el modelo esté estable
```

## 7. Shape compact puede seguir pesando demasiado

Estado:

```txt
DEUDA TÉCNICA MENOR
```

Problema:

```txt
shape=compact reduce ruido, pero aún puede cargar muchas reviews largas
```

Impacto:

```txt
más tokens de entrada para el LLM
más latencia
más costo
```

Acción sugerida:

```txt
evaluar shape=minimal si compact no basta
```

No implementar todavía.

No hay dolor real suficiente.
