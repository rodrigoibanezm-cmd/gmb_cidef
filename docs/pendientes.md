# Pendientes

Este documento registra decisiones pendientes o deuda de diseño que no debe mezclarse con la documentación ya validada.

## 1. Multi-tenant autenticado

Estado:

```txt
pendiente de diseño
```

Contexto:

```txt
El backend debe ser común para múltiples clientes.
El query engine debe seguir siendo agnóstico a clientes.
```

Estado actual:

```txt
runtime multi-tenant operativo vía tenant_id
```

Riesgo:

```txt
tenant no puede ser seguridad
tenant solo puede ser routing operativo
```

Dirección más probable:

```txt
OAuth
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
multi-login propio
OAuth prematuro
roles complejos
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
own_values
permisos
default_store_role
default_shape
allowed_intents
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
temporal por region
temporal por market_group
```

Objetivo:

```txt
resolver temporal completamente desde place_daily_metrics en Neon
```

## 4. Limpieza futura

Pendientes técnicos:

```txt
eliminar endpoints compare legacy si siguen vivos
limpiar helpers muertos no usados
evaluar shape="minimal" si compact aún pesa demasiado
```
