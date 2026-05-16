# Pendientes

Este documento registra decisiones pendientes o deuda de diseño que no debe mezclarse con la documentación ya validada.

## 1. Multi-tenant

Estado:

```txt
pendiente de diseño
no implementado
```

Contexto:

```txt
El backend debe ser común para múltiples clientes.
El query engine debe seguir siendo agnóstico a clientes.
```

Hipótesis MVP posible:

```txt
N Custom GPT shells
1 backend común
tenant declara ruta
token autoriza acceso
backend valida ambos
```

Riesgo:

```txt
tenant no puede ser seguridad.
tenant solo puede ser routing operativo.
```

Dirección más probable:

```txt
OAuth
```

Decisión futura esperada:

```txt
El tenant no lo decide el LLM.
El tenant se deriva de la identidad autenticada.
```

Diseño futuro deseado:

```txt
usuario autenticado
tenant derivado del token
permisos por usuario/tenant
auditoría por usuario
revocación de acceso
```

No implementar todavía:

```txt
tenant en payload como seguridad
multi-login propio
OAuth prematuro
```

## 2. Client config

Estado:

```txt
pendiente de diseño
```

Problema:

```txt
Para multi-tenant real, la configuración del cliente no puede estar hardcodeada en el motor.
```

Debe resolver:

```txt
dataset
own_values
places base
índices
permisos
fecha disponible
default_store_role
default_shape
allowed_intents
```

Ejemplo conceptual:

```json
{
  "tenant": "cidef",
  "dataset_key": "gmb:classified:cidef:v1",
  "own_values": ["own"],
  "default_store_role": "dealer",
  "default_shape": "compact",
  "allowed_intents": ["ranking", "gap", "evidence", "action", "cause"]
}
```

## 3. Temporal avanzado

Estado:

```txt
pendiente
```

Hoy:

```txt
temporal funciona como primera capa por ubicación.
```

Falta:

```txt
temporal por brand
temporal por operator
temporal por store_role
diferencia de reviews entre fechas usando review_seen:{date}
```

## 4. Limpieza futura

Pendientes técnicos:

```txt
separar endpoints legacy de endpoints nuevos
limpiar mezcla histórica de keys viejas/nuevas en evidencia
evaluar shape="minimal" si compact aún pesa demasiado
```
