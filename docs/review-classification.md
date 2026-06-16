# Review classification — Presión operacional (V1, cerrado)

## Estado

```txt
V1 cerrado, no definitivo
```

Este cierre está respaldado por evaluación empírica sobre dataset real (CIDEF/autos, 56 reviews, 49 clusters). Queda explícitamente abierto a una V2 si la evidencia post-implementación lo justifica.

## Frase de diseño

```txt
El LLM evalúa el daño.
El backend decide la agenda.
```

## Pipeline

```txt
Review (place_reviews, own scope)
  → LLM clasifica 5 campos
  → Backend agrupa por (place_id, topic_primary)
  → Backend calcula agregados de cluster
  → Backend aplica árbol de decisión (gates)
  → Backend asigna sección (urgente / importante / tareas)
  → Card se materializa solo con evidencia trazable (review_hash real)
```

## Campos LLM por review

```json
{
  "topic_primary": "string",
  "core": "1-4",
  "operational_impact": "1-4",
  "trust_impact": "1-4",
  "legal_flag": "boolean"
}
```

Definiciones:

```txt
topic_primary       — tema principal de la crítica. Agrupador, no decide gravedad.
core                — centralidad del daño para el negocio, evaluada en el
                       contexto específico de la review (no por lookup de tema).
operational_impact  — magnitud del impacto operacional descrito.
trust_impact        — magnitud del impacto sobre confianza, reputación o
                       credibilidad.
legal_flag          — existencia de escalamiento formal explícito o implícito
                       (SERNAC, demanda, denuncia, acusación de estafa,
                       devolución retenida, etc.). Lo decide el LLM, no
                       regex ni reglas de texto.
```

Reglas duras:

```txt
- core NO depende del topic. Dos reviews con el mismo topic pueden
  tener distinto core.
- legal_flag lo decide el LLM, nunca un regex.
- el backend no interpreta semántica, solo agrega y cuenta.
```

## Unidad de decisión: la señal, no la review

La review es la unidad de clasificación. La señal — la unidad que compite por espacio en el tablero — es el cluster.

```txt
cluster = (place_id, topic_primary)
```

Una señal puede estar compuesta por 1 o más reviews. Esto resuelve directamente la pregunta de fondo: no es "qué tan grave es esta review", es "esta evidencia agregada revela una presión que alguien debe decidir atender".

### Agregación por cluster

```txt
max_core
max_operational_impact
max_trust_impact
any(legal_flag)
signal_count
earliest_review_date
latest_review_date
```

`signal_count` ya captura reincidencia / patrón agrupado — no requiere un campo adicional por review. `earliest_review_date` / `latest_review_date` permiten distinguir dispersión temporal (una señal repetida en una semana no es lo mismo que una repetida en 8 meses), también sin campo adicional por review.

## Árbol de decisión (gates, no suma)

```txt
es_urgente =
    legal_flag = true
    OR (core = 4 AND operational_impact >= 3)
    OR (core = 4 AND trust_impact = 4 AND signal_count >= 2)

es_importante (solo si NOT es_urgente) =
    core = 3
    OR trust_impact >= 3
    OR operational_impact >= 3
    OR signal_count >= 2

tareas = todo lo demás con evidencia real

no_entra = sin texto / sin evidencia clara / comentario vago
```

Evaluación en cascada, en este orden. No es una partición lógicamente independiente por condición — es secuencial: se evalúa `es_urgente` primero, y solo si no califica se evalúa `es_importante`.

## Decisión: gates, no suma de puntajes

Se evaluó explícitamente la alternativa de sumar puntajes (`score = core + operational_impact + trust_impact + legal_flag * peso`) contra el árbol de gates, sobre los 49 clusters reales de CIDEF/autos. Resultado: **9 divergencias**, y en todas el gate clasificó mejor.

Tipos de divergencia encontrados:

```txt
Señal persistente pero leve, subestimada por la suma:        2 clusters
  (signal_count alto, intensidad baja en las 3 dimensiones —
  ej. canal de contacto caído, reportado varias veces)

Suma sobrerreacciona por correlación core/operational/trust,
sin gate crítico real (legal o core=4):                       3 clusters
  (doble conteo del mismo daño al sumar dimensiones
  correlacionadas)

Legal diluido por la suma:                                    0 clusters
  observados en este dataset — ver limitación más abajo
```

Razón estructural, no solo empírica: sumar vuelve compensable lo que el diseño quiere no-compensable. `legal_flag = true` debe disparar urgente sin importar el resto del vector, porque el tipo de riesgo (escalamiento formal) no es lineal con la intensidad percibida. Una suma puede esconder ese caso en el medio del ranking si el resto del vector es bajo. El gate no tiene ese problema porque no promedia: pregunta por condición, no por acumulación.

Adicionalmente, `core` y `operational_impact` muestran correlación alta en el dataset observado. Sumarlos arriesga contar el mismo daño dos veces — exactamente lo que se observó en los 3 casos donde la suma sobrerreaccionó.

**Dónde sí cabría un puntaje:** únicamente para desempate/ranking dentro de una sección ya decidida por el gate (por ejemplo, ordenar qué entra primero al tablero cuando hay más señales que los 12 espacios disponibles). No para decidir la sección.

## Qué se decidió NO agregar como campo, y por qué

Se evaluaron dos campos candidatos adicionales (`persistence_hint`, `conflict_state`) surgidos de un análisis crítico que buscó activamente romper el esquema de 5 campos contra el dataset real.

### `persistence_hint` (puntual / repetido / prolongado) — descartado

Ya está resuelto por `signal_count` + `earliest_review_date` / `latest_review_date`, calculados por el backend sobre el cluster. Pedirle al LLM que estime esto por review individual sería duplicar — con peor fuente de verdad — algo que el backend ya sabe con exactitud. Una review individual no tiene forma de saber si su problema es "repetido"; eso solo es observable al agrupar.

### `conflict_state` (abierto / resuelto / sin respuesta / devolución solicitada / garantía pendiente) — descartado para V1

Es información real que se pierde en la clasificación de 5 campos, pero el análisis del caso concreto mostró que afecta principalmente cómo se redacta la card (el "qué hacer"), no si el cluster cruza el umbral para entrar al tablero. Dos clusters con el mismo `core=4` + `legal_flag` apropiado entran a la misma sección correctamente, aunque uno sea un incidente puntual y otro un conflicto largo e iterativo — ambos merecen intervención inmediata, solo que la intervención se redacta distinto.

## Condición de cierre: evidencia textual completa hasta el narrador

V1 prioriza señales. La explicación fina (duración exacta, estado del conflicto, tipo específico de escalamiento, magnitud económica, fuerza probatoria) depende de evidencia textual completa, no de campos estructurados adicionales.

**Condición fuerte, no negociable para este cierre:** el LLM narrador debe recibir el texto crudo completo del cluster (todas las reviews que lo componen) junto con sus `review_hash`, no solo el vector de agregados. El pipeline ya declara esto en principio ("card se materializa solo con evidencia trazable, review_hash real"); este documento lo fija como condición explícita de que V1 funcione sin los campos descartados arriba.

Si después de implementar se observa que el narrador produce cards genéricas porque en la práctica solo le llega el vector agregado y no el texto, eso es evidencia para reabrir `conflict_state` en una V2 — no algo que deba resolverse agregando el campo preventivamente ahora.

## Decisión V1 (resumen)

```txt
✓ 5 campos LLM por review (topic_primary, core, operational_impact,
  trust_impact, legal_flag)
✓ Agrupación por cluster (place_id, topic_primary)
✓ Agregados de cluster calculados por backend: max_core,
  max_operational_impact, max_trust_impact, any(legal_flag),
  signal_count, earliest_review_date, latest_review_date
✓ Gates para decidir sección — no suma de puntajes
✓ Narrador recibe texto crudo completo del cluster + review_hash

✗ Sin persistence_hint (resuelto por signal_count + fechas)
✗ Sin conflict_state por ahora (afecta redacción, no sección)
✗ Sin suma de puntajes para decidir sección (validado empíricamente
  como inferior al gate en 9/49 clusters de prueba)
```

## Limitaciones explícitas (no bloqueantes)

```txt
1. legal_flag fue validado solo en automotriz/postventa (CIDEF).
   En el dataset observado, legal_flag nunca aparece con el resto
   del vector bajo (core/operational/trust en 1-2) — siempre coincide
   con gravedad ya alta en otra dimensión. No se pudo cruzar a otra
   vertical (Sodimac) para confirmar si esto es una característica
   real del dominio o un artefacto de muestra. Queda como riesgo
   teórico no descartado, no como falla observada.

2. operational_impact aporta separación real vs. core en rango medio:
   parcialmente refutado. El dataset muestra correlación alta entre
   ambos. No se eliminó el campo porque la correlación no es perfecta
   y el costo de mantenerlo es bajo, pero no se debe asumir que son
   dimensiones independientes al diseñar lógica futura sobre ellos.

3. conflict_state queda pendiente de reevaluación si, post-implementación,
   se observa que el narrador no logra redactar cards específicas
   recibiendo solo texto crudo + agregados.
```

## Pendiente explícito (fuera de este cierre)

```txt
- Validar legal_flag en al menos una vertical no-automotriz cuando
  haya acceso a ese dataset (Sodimac o Beauty Plus).
- Confirmar en producción que el narrador efectivamente recibe el
  texto completo del cluster, no solo agregados — y que esto es
  suficiente para redactar el "qué hacer" sin conflict_state.
- Correr el árbol completo sobre los 49 clusters dentro de
  gmb_cidef_ops antes de marcar la curación de cards como estable
  (más allá del experimento de validación ya corrido).
```
