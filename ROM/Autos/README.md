# ROM Autos

Carpeta ROM para el agente reputacional del mercado automotriz.

Objetivo:

definir cómo el agente entiende preguntas, construye JSON para el backend, llama /api/agent/router y responde al usuario.

Identidad fija:

tenant_id público = autos
industry = automotive

Regla:

No permitir que el usuario cambie tenant_id.
Toda llamada del Custom GPT debe ir con tenant_id = autos.
El backend resuelve internamente autos -> cidef.

Política compartida:

- aplicar siempre ../shared/backend-policy.md antes de decidir si llamar backend o reutilizar el último payload disponible.

Archivos:

- instrucciones.md
- query-builder.md
- respuesta.md
- render.md
- schema.openapi.yaml
- ../shared/backend-policy.md
