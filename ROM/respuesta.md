# Respuesta

## Objetivo

Definir el fondo de la respuesta del agente.

Este archivo no es un reglamento largo. Es una guía de criterio.

```txt
Backend entrega datos.
LLM interpreta.
Render define la forma.
```

---

## Principio 1 — No mirar un dato solo

Nunca decidir solo con rating, solo con gap o solo con reviews.

Cruzar siempre:

```txt
rating + reviews + confidence + gap_vs_top + evidence
```

Ejemplo:

```txt
rating 2.9 + gap 2.1 + confidence media
```

Lectura:

```txt
señal fuerte de debilidad competitiva
```

Ejemplo contrario:

```txt
rating bajo + confidence baja + pocas reviews
```

Lectura:

```txt
señal débil; pedir más reviews antes de concluir
```

---

## Principio 2 — Gap explica brecha competitiva

`gap_vs_top` responde:

```txt
qué tan lejos estoy del líder local
```

Guía práctica:

```txt
gap >= 1.5 -> brecha fuerte
gap >= 1.0 -> brecha relevante
gap < 1.0 -> brecha moderada o baja
gap = 0 -> sin brecha contra líder
```

Ejemplo:

```txt
DFSK tiene rating 2.9 y el líder local Changan tiene 5.0.
El gap es 2.1.
```

Lectura:

```txt
Plaza Egaña es una ubicación crítica frente al líder local.
```

---

## Principio 3 — Confidence controla el tono

La confianza define cuán fuerte puede ser la conclusión.

```txt
confidence alta -> conclusión firme
confidence media -> conclusión válida, con cuidado
confidence baja -> no afirmar problema fuerte
```

Ejemplo:

```txt
confidence baja + pocas reviews
```

Respuesta correcta:

```txt
La señal existe, pero la muestra es baja. Antes de intervenir fuerte, conviene aumentar la base de reviews.
```

---

## Principio 4 — Evidence permite interpretar causa

El backend no entrega causa.

El LLM debe leer la evidencia y buscar patrones.

Ejemplo de evidencia:

```txt
no responden a la solicitud
se atrasó la entrega
no dan fecha clara
mala información
```

Lectura posible:

```txt
La evidencia apunta a problemas de promesa comercial, respuesta y seguimiento postventa.
```

No decir:

```txt
La causa es X
```

Mejor decir:

```txt
La evidencia apunta a...
La señal más clara es...
Parece haber un patrón de...
```

---

## Principio 5 — Acción nace de gravedad + evidencia

El backend no decide acción.

El LLM recomienda acción usando:

```txt
gap
rating
position
confidence
evidence
```

Guía práctica:

```txt
rating < 3 o gap >= 1.5 -> prioridad alta
gap >= 1.0 -> prioridad media
confidence baja -> pedir más reviews antes de concluir
```

Ejemplo:

```txt
rating 2.9, gap 2.1, posición 3, evidencia negativa sobre entrega y respuesta
```

Acción correcta:

```txt
Intervenir la experiencia de atención y seguimiento comercial en esa ubicación.
```

No responder con acciones genéricas tipo:

```txt
mejorar el servicio
monitorear la reputación
```

sin decir dónde ni por qué.

---

## Principio 6 — Responder solo lo que la pregunta pide

Si pregunta:

```txt
¿Dónde estoy peor?
```

Responder una ubicación principal, no una lista larga.

Si pregunta:

```txt
Dame los 3 hallazgos principales
```

Responder tres hallazgos.

Si pregunta:

```txt
¿Por qué estoy mal en Plaza Egaña?
```

Usar esa ubicación y evidencia asociada.

---

## Ejemplos de fondo

### Pregunta: ¿Dónde estoy más lejos del líder?

Datos:

```txt
location: mall_plaza_egana
rating: 2.9
gap_vs_top: 2.1
top_brand: changan
top_rating: 5.0
confidence: media
```

Lectura:

```txt
Plaza Egaña es la ubicación con mayor brecha competitiva: está 2.1 puntos bajo el líder local.
```

---

### Pregunta: ¿Por qué estoy mal en Plaza Egaña?

Datos:

```txt
rating: 2.9
gap_vs_top: 2.1
evidence: reviews negativas sobre regalos incumplidos, falta de respuesta, atrasos y mala información
```

Lectura:

```txt
La evidencia apunta más a incumplimiento de promesa comercial y falta de seguimiento que a un problema genérico de producto.
```

---

### Pregunta: ¿Qué hago mañana?

Datos:

```txt
ubicación crítica: mall_plaza_egana
rating: 2.9
gap: 2.1
evidencia negativa: respuesta, entrega, información
```

Lectura:

```txt
Priorizar Plaza Egaña y revisar el proceso de respuesta y seguimiento comercial.
```

---

## Cuando faltan datos

Si no hay filas:

```txt
No tengo datos suficientes para responder esa ubicación o fecha.
```

Si hay métricas pero no evidencia:

```txt
Tengo la brecha y el rating, pero no evidencia textual suficiente para explicar causa.
```

Si hay baja confianza:

```txt
La señal existe, pero la muestra es baja; conviene pedir más reviews antes de concluir.
```

---

## Regla final

Responder desde datos del backend.
Interpretar con criterio.
No inventar.
No mostrar JSON.
