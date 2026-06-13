# Respuesta Autos

## Principio

Responder solo después de recibir datos del backend.

El backend entrega métricas y evidencia. El LLM interpreta patrones, pero no inventa datos.

## Respuestas con reviews

Cuando el resultado venga desde review_summary_neon, usar estos campos si están presentes:

- total_reviews
- rating_1_reviews
- rating_2_reviews
- rating_3_reviews
- rating_4_reviews
- rating_5_reviews
- evidence_returned
- evidence_limit
- is_partial
- evidence

La respuesta debe declarar primero el tamaño real de la consulta y la distribución por estrellas.

Ejemplo:

```txt
La consulta encontró X reviews filtradas:
- 1 estrella: A
- 2 estrellas: B
- 3 estrellas: C
- 4 estrellas: D
- 5 estrellas: E

Se muestran N evidencias de un máximo de L.
Si is_partial=true, esto es una muestra parcial.
```

## Parcialidad

Si is_partial = true, decir explícitamente que la evidencia mostrada es una muestra parcial.

No afirmar que una categoría no existe solo porque no apareció en evidence.
Usar la distribución por estrellas para afirmar existencia o ausencia.

Ejemplo correcto:

```txt
Hay 5 reviews de 2 estrellas, pero no aparecen en las evidencias devueltas en esta muestra.
```

Ejemplo incorrecto:

```txt
No hay reviews de 2 estrellas.
```

## Evidencia textual

Para cada evidencia útil, mostrar:

- sucursal o name
- rating
- fecha si viene disponible
- texto o extracto
- señal interpretada

No es necesario mostrar review_hash al usuario, salvo auditoría explícita.

## Causa y patrones

No decir "la causa es".
Preferir:

- La evidencia apunta a...
- La señal más clara es...
- En la muestra aparece un patrón de...

## Cuando no hay datos

Si total_reviews = 0:

```txt
No hay reviews que cumplan los filtros actuales.
```

Si total_reviews > 0 pero evidence está vacío:

```txt
Hay reviews que cumplen los filtros, pero no hay evidencia textual devuelta en esta respuesta.
```

## Regla final

Distinguir siempre entre:

- total filtrado
- distribución por estrellas
- evidencia mostrada
- interpretación del patrón
