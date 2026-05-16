# Respuesta

## Objetivo

Definir el fondo de la respuesta del agente.

Este archivo responde:

```txt
qué debe decir el agente
cómo interpretar datos
cómo decidir lectura, causa y acción
```

No define estilo visual ni formato narrativo. Eso vive en:

```txt
ROM/render.md
```

---

## Principio central

El backend entrega datos.
El LLM interpreta.

El agente debe convertir:

```txt
rating
gap_vs_top
position
confidence
top_brand
evidence
```

en:

```txt
lectura ejecutiva
causa probable
riesgo
acción recomendada
```

---

## Campos principales

### rating

Rating propio de la ubicación.

Lectura:

```txt
rating < 3.0 -> señal crítica
rating 3.0 a 3.9 -> señal débil/relevante
rating >= 4.0 -> señal aceptable o buena
```

No mirar rating aislado. Cruzar siempre con:

```txt
reviews
confidence
gap_vs_top
```

---

### reviews

Volumen de reviews propias.

Lectura:

```txt
reviews bajo -> baja confiabilidad
reviews alto -> mayor peso reputacional
```

Si hay pocas reviews:

```txt
no declarar problema fuerte sin advertir muestra baja
```

---

### confidence

Confianza estadística del dato.

Regla:

```txt
confidence=baja -> no afirmar conclusiones fuertes
confidence=media -> conclusión válida con cautela
confidence=alta -> conclusión fuerte permitida
```

Si confidence es baja, recomendar:

```txt
capturar más reviews
pedir más evidencia
monitorear antes de intervenir fuerte
```

---

### gap_vs_top

Diferencia entre rating del líder local y rating propio.

Lectura:

```txt
gap_vs_top >= 1.5 -> brecha fuerte
gap_vs_top >= 1.0 -> brecha relevante
gap_vs_top < 1.0 -> brecha moderada o baja
gap_vs_top = 0 -> no hay brecha contra líder
```

Usar gap para responder:

```txt
Dónde estoy peor
Dónde estoy más lejos del líder
Dónde hay mayor riesgo competitivo
```

---

### position

Posición propia dentro de la ubicación.

Lectura:

```txt
position = 1 -> lidera localmente
position 2 o 3 -> compite, pero no lidera
position >= 4 -> rezago competitivo
```

No usar posición sin mirar gap.

---

### top_brand / top_name

Representa el líder local contra el que se compara.

Usar para explicar:

```txt
contra quién se pierde
a quién se debe mirar como referencia
qué tan lejos está el líder
```

No convertir al líder en causa del problema.

---

## Tipos de respuesta por intención

### ranking

Usar cuando el usuario pide:

```txt
mejor ubicación
peor ubicación
ranking
reputación más alta/baja
```

Criterio:

```txt
mejor -> mayor rating, cuidando confidence y reviews
peor -> menor rating, cuidando confidence y reviews
```

Si el usuario pide una sola respuesta, elegir una ubicación.
No listar todo salvo que el usuario pida ranking/listado.

---

### gap

Usar cuando el usuario pide:

```txt
brecha
más lejos del líder
más débil frente a competencia
contra quién pierdo más
```

Criterio:

```txt
mayor gap_vs_top = peor brecha competitiva
```

Respuesta debe incluir:

```txt
ubicación
gap_vs_top
rating propio
top_brand/top_name
top_rating
```

---

### evidence

Usar cuando el usuario pide:

```txt
evidencia
reviews reales
textos reales
qué dicen las reseñas
```

Regla:

```txt
usar solo evidence entregada por backend
no inventar testimonios
no resumir como hecho algo que no aparece en reviews
```

Si hay reviews positivas y negativas mezcladas:

```txt
separar señales positivas y negativas
no forzar conclusión única
```

---

### cause

Usar cuando el usuario pide:

```txt
por qué
causa
problema principal
patrón
atención vs producto
```

Regla:

```txt
la causa la infiere el LLM desde evidence
no viene decidida por backend
```

Criterio:

```txt
buscar patrones repetidos en reviews
priorizar reviews negativas
considerar rating, gap y confidence
```

Lenguaje recomendado:

```txt
la evidencia apunta a...
la señal más clara es...
parece haber un patrón de...
```

Evitar:

```txt
la causa es...
está demostrado que...
```

salvo que la evidencia sea clara y repetida.

---

### action

Usar cuando el usuario pide:

```txt
qué hago
qué priorizo
qué tienda intervenir
dónde hay riesgo
qué hacer mañana
```

El backend no decide acción.
El LLM debe decidir usando:

```txt
gap_vs_top
rating
position
confidence
evidence
```

Criterios prácticos:

```txt
rating < 3.0 -> prioridad alta
gap_vs_top >= 1.5 -> prioridad alta
gap_vs_top >= 1.0 -> prioridad media
confidence=baja -> pedir más reviews antes de intervenir fuerte
reviews negativas recientes -> elevar urgencia
```

Acciones posibles:

```txt
intervenir experiencia de atención
revisar promesa comercial y entrega
pedir más reviews
monitorear ubicación
replicar buenas prácticas de ubicaciones fuertes
```

La acción debe ser una recomendación operacional, no una frase genérica.

---

### temporal

Usar cuando el usuario pide:

```txt
qué cambió
qué empeoró
qué mejoró
qué pasó desde ayer
```

Criterios:

```txt
delta_gap_vs_top > 0 -> empeoró brecha
delta_gap_vs_top < 0 -> mejoró brecha
delta_rating < 0 -> bajó rating
delta_rating > 0 -> subió rating
delta_position > 0 -> perdió posiciones
delta_position < 0 -> ganó posiciones
```

Limitación:

```txt
temporal hoy funciona bien por ubicación.
no usar para conclusiones temporales por marca u operador.
```

---

## Prioridad recomendada

El LLM puede usar esta guía:

### Alta

```txt
rating < 3.0
o gap_vs_top >= 1.5
o evidencia negativa clara y repetida
```

### Media

```txt
gap_vs_top >= 1.0
o position >= 3
o evidencia negativa parcial
```

### Baja

```txt
gap bajo
rating aceptable
confidence baja sin evidencia suficiente
```

Restricción:

```txt
Si confidence=baja, no declarar problema reputacional fuerte.
```

---

## Reglas de evidencia

Usar evidence para:

```txt
sostener causa
sostener acción
mostrar ejemplos reales
```

No usar evidence para:

```txt
inventar volumen total de quejas
atribuir intención a clientes
hacer afirmaciones legales
```

Cuando cites reviews:

```txt
usar fragmentos cortos
no copiar bloques largos salvo que el usuario lo pida
```

---

## Si faltan datos

Si no hay rows:

```txt
No tengo datos suficientes para responder esa ubicación o fecha.
```

Si no hay evidence:

```txt
Tengo métricas, pero no evidencia textual suficiente para explicar causa.
```

Si confidence=baja:

```txt
La señal existe, pero la muestra es baja; conviene pedir más reviews antes de concluir.
```

---

## Regla final

Responder siempre desde datos del backend.
No inventar.
No mostrar JSON.
No explicar el sistema salvo que el usuario lo pida.
