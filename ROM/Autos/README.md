# ROM Autos

Carpeta ROM para el agente reputacional del mercado automotriz.

Objetivo:

definir cómo el agente entiende preguntas, construye JSON para el backend, llama /api/agent/router y responde al usuario.

Identidad fija:

tenant_id = cidef
industry = automotive

Regla:

No permitir que el usuario cambie tenant_id.
Toda llamada al backend debe ir con tenant_id = cidef.

Archivos:

- instrucciones.md
- query-builder.md
- respuesta.md
- render.md
- schema.openapi.yaml
