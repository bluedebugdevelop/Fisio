# Fisio CRM — Portal del Paciente sin Chat

**Fecha:** 2026-07-01
**Base:** MVP de clínica en `codex/mvp-closeout`
**Fuera de alcance:** chat online, mensajería realtime, facturación, pagos y bonos.

## Objetivo

Permitir que un paciente acceda a un portal propio para consultar sus citas, cancelar o confirmar citas, solicitar nuevas citas, ver documentos compartidos y mantener sus datos básicos de contacto.

## Modelo de acceso

- El paciente usa Supabase Auth, pero no pertenece a `clinic_members`.
- Se añade `patient_accounts` para vincular `auth.users.id` con `patients.id`.
- Un paciente sólo puede tener acceso a sus propios datos mediante funciones `security definer` y consultas de backend.
- La clínica vincula la cuenta del portal desde la ficha del paciente usando el email del paciente.

## Funcionalidad

### Portal

- `/portal`: resumen con próximas citas, clínica y accesos rápidos.
- `/portal/citas`: próximas citas e historial.
- `/portal/citas/nueva`: solicitud de cita desde huecos disponibles.
- `/portal/documentos`: documentos del paciente con URLs firmadas de descarga.
- `/portal/perfil`: datos de contacto editables.

### Acciones del paciente

- Confirmar cita programada.
- Cancelar cita futura indicando motivo.
- Solicitar nueva cita eligiendo tipo de servicio, profesional opcional, fecha y hora.
- Actualizar teléfono, email, dirección, ciudad y código postal.

## Reglas

- La reserva online crea citas en estado `scheduled`.
- La reserva respeta duración del servicio, horario base de la clínica y anti-solapamiento existente en Postgres.
- No se muestran notas clínicas ni diagnósticos en el portal.
- Los documentos se descargan con URLs firmadas de corta duración.

## Seguridad

- `patient_accounts` tiene RLS para que el usuario autenticado vea sólo sus vínculos.
- Las operaciones del portal validan la relación `auth.uid() -> patient_accounts -> patients`.
- No se reutiliza `clinic_members` para pacientes.
- El middleware deja públicas las rutas de auth y protege `/portal`.

## Verificación

- Tests de dominio para disponibilidad, confirmación/cancelación y actualización permitida de perfil.
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- Prueba local en navegador: `/signup`/login y `/portal`.
