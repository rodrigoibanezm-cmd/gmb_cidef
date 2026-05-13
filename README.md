# GMB CIDEF — Base de Inteligencia Reputacional Automotor

## 1. Resumen ejecutivo

Este proyecto construye una base inicial del ecosistema automotor chileno usando Google My Business / Google Places como fuente pública.

El objetivo no es crear un directorio perfecto.

El objetivo es capturar una red suficientemente amplia de:

- CIDEF,
- dealers,
- competencia,
- postventa,
- servicio técnico,
- hubs automotrices,
- malls,
- operadores multimarca.

La base permitirá clasificar entidades, limpiar ruido y preparar una capa posterior de análisis reputacional y competitivo.

---

## 2. Hechos ya validados

- Existe señal pública suficiente en Google Places / Google My Business para justificar un MVP.
- La señal útil no está solo en CIDEF; aparece principalmente al sumar dealers, competencia, postventa y hubs automotrices.
- La competencia tiene mucha más masa reputacional que CIDEF en varios puntos visibles.
- La estrategia de red de arrastre funcionó: capturó un universo amplio de entidades.
- El dataset consolidado contiene aproximadamente 1.600 `place_id` únicos.
- Existe basura en la captura, pero es esperable y manejable.
- El identificador central del sistema es `place_id`.
- Los malls son relevantes porque concentran competencia directa a pocos metros.
- La postventa y el servicio técnico concentran gran parte de la señal reputacional útil.

---

## 3. Decisiones de diseño tomadas

- Se prioriza cobertura antes que precisión en la etapa inicial.
- No se borra basura todavía; se clasifica como `trash`.
- El CSV original debe permanecer intacto.
- El LLM no debe recibir el CSV crudo completo.
- El LLM no debe buscar internet ni inventar contexto.
- El backend debe entregar lotes pequeños y sanitizados.
- El tamaño inicial de lote será de 25 filas.
- El backend valida enums y consistencia.
- El LLM solo clasifica; no es fuente de verdad.
- Se usará un catálogo maestro controlado para marcas, operadores y roles competitivos.
- No se usará vector DB, embeddings ni RAG en esta etapa.

---

## 4. Qué hace hoy el sistema

Hoy el proyecto ya tiene una base exploratoria construida a partir de Google Places.

La captura permitió:

- buscar marcas,
- buscar operadores,
- buscar postventa,
- buscar servicio técnico,
- buscar hubs automotrices,
- buscar malls,
- consolidar resultados,
- deduplicar por `place_id`,
- generar un archivo maestro inicial.

Archivo principal esperado:

```txt
master_places.csv
```

---

## 5. Qué NO hace todavía

El sistema todavía no:

- lee reviews individuales,
- clasifica semánticamente reviews,
- genera alertas,
- monitorea cambios diarios,
- tiene dashboard,
- mide ventas,
- mide conversión,
- reemplaza CRM,
- reemplaza sistemas internos de postventa,
- tiene clasificación final validada,
- tiene catálogo maestro definitivo,
- tiene backend operativo de clasificación por lotes.

Esta etapa es base exploratoria y de preparación.

---

## 6. Componentes existentes

### Scripts de captura

Se usaron scripts PowerShell contra Google Places API v1.

Endpoint:

```txt
https://places.googleapis.com/v1/places:searchText
```

Campos utilizados:

- `places.id`
- `places.displayName`
- `places.formattedAddress`
- `places.location`
- `places.rating`
- `places.userRatingCount`
- `places.businessStatus`
- `places.types`
- `places.primaryType`
- `places.googleMapsUri`
- `places.websiteUri`

### Script de consolidación

Se definió un script Python para unir archivos `places*.csv`, deduplicar por `place_id` y generar `master_places.csv`.

---

## 7. Datasets generados

Se generaron archivos CSV de captura exploratoria, entre ellos:

- seeds Dongfeng / CIDEF,
- seeds automotoras,
- seeds postventa,
- dataset consolidado.

El dataset consolidado contiene aproximadamente:

- 1.600 IDs únicos,
- dealers,
- competencia,
- malls,
- hubs,
- servicio técnico,
- postventa,
- ruido no automotor.

---

## 8. Modelo de clasificación definido

La clasificación debe producir JSON estructurado.

### Output esperado por fila

```json
{
  "place_id": "",
  "candidate_status": "keep",
  "entity_type": "dealer",
  "primary_brand": "dongfeng",
  "all_brands": ["dongfeng", "dfsk"],
  "operator": "cidef",
  "competitive_role": "cidef_core",
  "operation_type": "sales_and_service",
  "confidence": 0.91,
  "review_required": false,
  "review_reason": ""
}
```

---

## 9. Enums definidos

### `candidate_status`

```txt
keep
review
trash
```

### `entity_type`

```txt
dealer
service_center
automotive_hub
mall
multibrand
parts_store
other
trash
```

### `operation_type`

```txt
sales
service
parts
sales_and_service
unknown
not_applicable
```

### `competitive_role`

```txt
cidef_core
cidef_dealer
direct_competitor
indirect_competitor
market_context
infrastructure
trash
```

---

## 10. Campos clave

### `primary_brand`

Marca dominante visible en el registro.

### `all_brands`

Lista de marcas visibles o asociadas.

Esto es importante porque varios dealers son multimarca.

### `operator`

Dealer u operador principal.

Ejemplos:

- `cidef`
- `derco`
- `inchcape`
- `rosselot`
- `pompeyo`
- `yusic`
- `salazar_israel`

### `competitive_role`

Rol competitivo de la entidad respecto al universo CIDEF / Dongfeng.

---

## 11. Flujo operativo propuesto

El flujo de clasificación será por lotes.

```txt
1. Backend lee master_places.csv
2. Backend entrega 25 filas pendientes y sanitizadas
3. LLM clasifica usando catálogo maestro
4. LLM devuelve JSON estructurado
5. Backend valida enums y place_id
6. Backend guarda resultado incremental
7. Se repite hasta terminar
```

El LLM solo debe recibir:

```json
{
  "place_id": "",
  "name": "",
  "address": "",
  "types": "",
  "query_origin": ""
}
```

No debe recibir el CSV crudo completo.

---

## 12. Catálogo maestro

El backend debe proveer un catálogo maestro con:

- marcas válidas,
- operadores válidos,
- aliases,
- roles competitivos,
- tipos de entidad,
- tipos de operación.

Regla:

- El LLM solo puede usar valores del catálogo.
- Si no está seguro, debe usar `unknown` y marcar `review_required = true`.

---

## 13. Riesgos conocidos

- Google Places devuelve entidades mezcladas y nombres inconsistentes.
- Los malls inflan artificialmente el volumen de reviews.
- Algunos dealers son multimarca y pueden ser difíciles de clasificar.
- Algunas entidades pueden ser infraestructura útil, no competencia directa.
- La captura amplia trae basura inevitable.
- El rating promedio aislado no sirve como insight suficiente.
- Sin clasificación, el análisis queda contaminado.

---

## 14. Pendientes inmediatos

1. Crear backend mínimo de clasificación por lotes.
2. Definir catálogo maestro inicial.
3. Clasificar `master_places.csv`.
4. Exportar dataset limpio.
5. Revisar manualmente casos `review`.
6. Recién después capturar reviews individuales por `place_id`.

---

## 15. Impacto esperado

Este sistema puede impactar:

- gerencia comercial,
- reputación,
- postventa,
- evaluación de dealers,
- benchmark competitivo,
- expansión retail,
- entrenamiento comercial,
- percepción de marcas chinas,
- detección temprana de quiebres operacionales.

---

## 16. Principio rector

La mejor solución es la más simple.

En esta etapa:

- CSV antes que base de datos,
- clasificación por lotes antes que automatización total,
- catálogo cerrado antes que inferencia libre,
- validación backend antes que confianza ciega en el LLM.
