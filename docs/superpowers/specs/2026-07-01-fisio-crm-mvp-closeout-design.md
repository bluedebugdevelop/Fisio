# Fisio CRM — Cierre de MVP

**Fecha:** 2026-07-01
**Documento origen:** `Especificacion-CRM-Fisioterapia.html`
**Base existente:** `docs/superpowers/specs/2026-06-09-fisio-crm-design.md`

## Objetivo

Cerrar el MVP vendible definido por la especificación: agenda completa, pacientes, fisios/salas/servicios, recordatorios, historia clínica básica, notas de sesión, documentos, consentimiento y auditoría.

No se implementan en esta fase el portal del paciente, chat, reserva online, facturación, bonos, pagos ni app móvil.

## Alcance aprobado

### Agenda

- Mantener las vistas de día, semana y mes.
- Añadir cuadrante operativo por recursos, usando FullCalendar Resource TimeGrid.
- Permitir ver el cuadrante por fisio y por sala.
- Mantener creación, edición, movimiento y cancelación de citas.
- Añadir duplicado de citas.
- Mantener estados: programada, confirmada, llegó, realizada, no presentada y cancelada.
- Preservar validación anti-solapamiento por fisio y por sala en base de datos.

### Recordatorios

- Mantener recordatorios automáticos por email.
- Mantener plantillas y cola de envíos.
- Dejar WhatsApp/SMS preparado como alcance futuro, sin envío real en esta fase.
- Registrar el texto enviado en `payload_snapshot`.
- Mantener el modo simulado cuando Resend no está configurado.

### Operativa clínica

- Mantener pacientes, consentimientos versionados, historia clínica, notas SOAP y documentos.
- Mantener acceso clínico restringido a admin/fisio; recepción no ve historia, sesiones ni documentos.
- Mantener auditoría de vistas/escrituras clínicas.
- Pulir navegación para que las piezas del MVP estén accesibles desde el panel sin callejones intermedios.

## Decisiones

- El MVP usa web responsive, no app móvil nativa.
- Supabase RLS sigue siendo la fuente de verdad de aislamiento multi-clínica.
- El envío real de WhatsApp/SMS se aplaza porque requiere proveedor, alta de plantillas y coste externo.
- No se añade un sistema de notificaciones complejo. Si se añaden avisos al fisio, serán por email/in-app usando la infraestructura de recordatorios existente.

## Plan de pruebas

- Añadir tests de dominio para duplicado de citas y navegación de rangos del calendario si la lógica se extrae a funciones puras.
- Añadir tests de recordatorios para asegurar canales soportados y snapshot de payload.
- Ejecutar `pnpm test`.
- Ejecutar `pnpm typecheck`.
- Ejecutar `pnpm build`.
- Revisar visualmente la agenda si el entorno local puede arrancar.
