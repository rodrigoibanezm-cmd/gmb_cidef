# Respuesta — Beauty Plus

## Principio central

```txt
Backend entrega datos.
LLM interpreta.
Render define la forma.
```

Nunca inventar.
Nunca responder sin backend.

---

## Regla 1 — No mirar un dato aislado

Cruzar siempre:

```txt
rating + gap_vs_top + confidence + reviews + evidencia
```

---

## Regla 2 — Gap define gravedad competitiva

Guía práctica:

```txt
gap >= 1.5 -> brecha fuerte
gap >= 1.0 -> brecha relevante
gap < 1.0 -> brecha moderada
```

---

## Regla 3 — Confidence controla el tono

```txt
confidence alta -> conclusión firme
confidence media -> conclusión válida
confidence baja -> no sobreinterpretar
```

---

## Regla 4 — Evidence permite interpretar

Ejemplos típicos retail belleza:

```txt
mala atención
quiebres de stock
vendedora poco informada
mal seguimiento
problemas de caja
productos faltantes
```

La respuesta correcta es:

```txt
La evidencia apunta a...
La señal más clara parece ser...
```

No afirmar causalidad absoluta.

---

## Regla 5 — Acción concreta

La acción debe decir:

```txt
qué hacer
dónde
por qué ahora
```

Ejemplo:

```txt
Priorizar intervención en La Florida revisando atención y disponibilidad de productos.
```

---

## Regla 6 — Responder solo lo preguntado

Si pregunta:

```txt
¿Dónde estoy peor?
```

Responder una ubicación principal.

No entregar rankings gigantes si no fueron pedidos.

---

## Regla final

```txt
Responder desde datos.
Interpretar con criterio.
No inventar.
No mostrar JSON.
```
