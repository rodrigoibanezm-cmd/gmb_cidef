# Deuda técnica

Este documento registra deuda técnica real del sistema.

No es backlog de ideas.
No es diseño pendiente.
No es roadmap comercial.

## 1. Temporal lento

Estado:

```txt
DEUDA TÉCNICA
```

Problema:

```txt
scope=temporal hoy compara dos fechas ejecutando lecturas por ubicación.
```

Impacto:

```txt
alta latencia
muchas lecturas Upstash
mala experiencia si crece el universo de places
```

Causa:

```txt
no existe índice compacto temporal precomputado por fecha
```

Acción sugerida:

```txt
crear resumen compacto por fecha/rol para reducir lecturas
```

Ejemplo futuro:

```txt
gmb:index:{date}:location_summaries:{role}
```

## 2. Temporal limitado a ubicación

Estado:

```txt
DEUDA TÉCNICA
```

Problema:

```txt
scope=temporal funciona como primera capa por ubicación.
No soporta correctamente brand/operator/store_role temporal.
```

Impacto:

```txt
preguntas temporales por marca u operador quedan fuera o débiles
```

Causa:

```txt
executeTemporal compara summaries construidos por location
```

Acción sugerida:

```txt
crear temporal agrupado por dimensión o reutilizar executeIntra con snapshot por fecha
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
riesgo de usar endpoints viejos en runtime del agente
```

Endpoints legacy:

```txt
GET /api/compare-all
GET /api/compare
```

Acción sugerida:

```txt
mantener solo como compatibilidad/debug o moverlos explícitamente a legacy
```

## 4. Mezcla histórica de keys de reviews

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

## 5. Normalización ownership hardcodeada

Estado:

```txt
DEUDA TÉCNICA
```

Problema:

```txt
la migración actual normaliza cidef -> own y el resto -> competitor
```

Impacto:

```txt
no sirve para multi-tenant real
acopla lógica de cliente al sistema
```

Acción sugerida:

```txt
mover ownership/own_values a client_config cuando se diseñe multi-tenant
```

## 6. Shape compact puede seguir pesando demasiado

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

## 7. Índices por fecha requieren disciplina operativa

Estado:

```txt
DEUDA OPERATIVA
```

Problema:

```txt
las queries dependen de índices diarios consistentes
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
