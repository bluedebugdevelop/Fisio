# Fisio CRM — Diseño funcional y técnico (MVP)

**Producto:** Software de Gestión para Clínicas de Fisioterapia (CRM + Historia Clínica Electrónica + Agenda + Portal del paciente).
**Modelo:** SaaS multi-tenant (una instancia, muchas clínicas aisladas).
**Documento origen:** `Especificacion-CRM-Fisioterapia.html`.
**Versión:** 1.0 — 2026-06-09.

---

## 1. Alcance del MVP de esta iteración

El documento origen define 6 fases (0–5). Esta spec cubre **Fase 0 + Fase 1 + Fase 2 + base de Fase 3**, que el propio documento define como MVP vendible (sección 8).

### Dentro del MVP

- **F0 — Cimientos:** proyecto, autenticación, roles, multi-tenancy, base RGPD, registro de auditoría.
- **F1 — Agenda:** calendario por fisio / sala / centro, alta-edición-cancelación de citas, estados de cita, validación anti-solapamientos.
- **F2 — Recordatorios:** modelo de recordatorios, plantillas, UI de configuración y registro de envíos. El envío real por email (Resend) queda como integración opcional al cierre del MVP. WhatsApp queda **fuera** (requiere alta de plantillas en Meta y coste por mensaje).
- **F3 base — Fichas e historia clínica:** ficha de paciente, historia clínica única por paciente, nota de sesión enlazada a cita, documentos del paciente en Supabase Storage.

### Explícitamente fuera del MVP

- **F4 — Portal del paciente y chat:** login de paciente, vista de sus citas, chat 1-a-1 con su fisio, reserva online.
- **F5 — Negocio:** facturación, bonos, pagos, estadísticas avanzadas.
- WhatsApp / SMS como canales de envío.
- App móvil nativa.

### Roles soportados

| Rol | Pertenece a | Permisos clave |
|---|---|---|
| `admin` | una o varias clínicas | Gestiona miembros, salas, configuración, ve toda la agenda y todas las fichas de su clínica. |
| `physio` | una o varias clínicas | Ve y edita su agenda, las fichas de los pacientes que ha atendido o tiene asignados, registra notas de sesión. |
| `reception` | una clínica | Crea / mueve citas, alta de pacientes, ve agenda y datos de contacto. **No** ve detalle clínico. |

El usuario `patient` queda definido en el modelo pero su login es F4 (fuera de MVP).

---

## 2. Stack tecnológico

| Capa | Decisión | Por qué |
|---|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript | Coincide con la recomendación de la spec y permite panel y futuro portal en la misma base. |
| UI | Tailwind CSS + shadcn/ui (Radix) | Componentes accesibles y consistentes, theming sencillo. |
| Calendario | FullCalendar (`@fullcalendar/react`) | Vistas día/semana/mes, drag&drop, recursos (salas) y filtrado por fisio. |
| Backend datos | Supabase (Postgres + Auth + RLS + Storage) | Auth con roles, RLS para multi-tenancy clínico, storage privado para documentos. Región **EU** obligatoria. |
| Realtime (futuro chat) | Supabase Realtime | Reservado para F4. No requiere infra extra. |
| Email | Resend | Para recordatorios. Integración opcional en MVP (lo importante es tener el modelo y la UI). |
| Hosting | Vercel | Cero fricción con Next.js. Datos en Supabase EU. |
| Idioma | Español (`es-ES`) | Default y único activo. `next-intl` instalado y preparado para i18n futura. |
| Fechas | `date-fns` + `date-fns-tz` | Zona horaria explícita por clínica. |
| Validación | `zod` | Esquemas compartidos client/server. |
| Form | `react-hook-form` + `@hookform/resolvers/zod` | Standard del ecosistema. |

### Alternativas descartadas para este MVP

- Backend propio (Node/NestJS): mucho más trabajo de auth/RLS para lo mismo.
- Auth.js / Clerk como auth: Supabase Auth se integra con RLS sin esfuerzo extra.
- Prisma: redundante con el cliente tipado de Supabase y rompe RLS si no se usa con cuidado.

---

## 3. Multi-tenancy

### Estrategia

- Una sola base de datos Postgres.
- Cada **clínica** es un tenant aislado.
- Toda tabla operativa lleva `clinic_id` (incluso `appointments`, `patients`, `documents`, `audit_logs`).
- El aislamiento se garantiza en la base de datos con **Row Level Security**, **no** en la aplicación. La capa de aplicación añade defensa en profundidad pero no es la fuente de la verdad.
- Un mismo `auth.users.id` puede pertenecer a varias clínicas con roles distintos. Se modela con la tabla pivote `clinic_members`.

### Clínica activa en sesión

- La clínica activa va en una cookie `active_clinic_id` firmada (o JWT custom claim si se complica con cookies). El middleware la valida contra `clinic_members` en cada request.
- Si el usuario pertenece a varias clínicas, en el layout del panel aparece un selector. Cambiar de clínica recarga el contexto (no se permite ver datos cruzados de dos clínicas).

### Política RLS (esqueleto)

Para cada tabla con `clinic_id`:

```sql
create policy "tenant_isolation_select" on <tabla>
  for select using (
    exists (
      select 1 from clinic_members cm
      where cm.user_id = auth.uid()
        and cm.clinic_id = <tabla>.clinic_id
    )
  );
```

Más reglas por acción (`insert`, `update`, `delete`) y por rol (p.ej. `reception` no puede leer `session_notes`).

---

## 4. Modelo de datos

Todas las tablas usan `id uuid primary key default gen_random_uuid()` y `created_at timestamptz default now()` salvo indicación. Borrado lógico mediante `deleted_at timestamptz null` en entidades clínicas.

### 4.1 Tenant y miembros

**`clinics`**
- `name`, `legal_name`, `cif`, `address`, `city`, `postal_code`, `country` (`es` por defecto), `timezone` (`Europe/Madrid` por defecto), `phone`, `email`, `logo_url`, `created_at`.

**`clinic_members`** (pivote)
- `clinic_id` → `clinics.id`
- `user_id` → `auth.users.id`
- `role` enum (`admin`, `physio`, `reception`)
- `is_active boolean default true`
- `created_at`
- UNIQUE(`clinic_id`, `user_id`)

### 4.2 Recursos de la clínica

**`professionals`** (extiende `clinic_members` con datos de fisio)
- `id` (PK propia)
- `clinic_id`, `user_id` (FK a `clinic_members` por `clinic_id`+`user_id`)
- `license_number` (nº colegiado)
- `specialty`
- `display_name` (nombre mostrado en agenda)
- `color` (hex para identificarle en el calendario)
- `default_appointment_minutes` (default 45)
- `weekly_schedule jsonb` (estructura: días → tramos horarios)
- `is_active`

**`rooms`**
- `clinic_id`, `name`, `kind` (`consulta`, `box`, `gimnasio`, `otro`), `capacity int default 1`, `color`, `is_active`.

**`service_types`** (tipos de sesión)
- `clinic_id`, `name`, `duration_minutes`, `color`, `price_cents int null`, `is_active`.
- Se pre-popula con: "Primera consulta" (60min), "Sesión de seguimiento" (45min), "Punción seca" (30min), "Drenaje linfático" (60min). El admin puede editar.

### 4.3 Pacientes

**`patients`**
- `clinic_id`
- `first_name`, `last_name`
- `dni` (formato libre, único por clínica si no nulo)
- `birth_date date`
- `gender` (`f`, `m`, `x`, `none`)
- `phone`, `email`
- `address`, `city`, `postal_code`
- `notes_admin` (notas no clínicas; visibles para recepción/admin)
- `referred_by` (cómo llegó: boca a boca, web, médico, otros)
- `is_active`, `deleted_at`

**`patient_consents`** (consentimientos firmados, versionados)
- `patient_id`, `clinic_id`
- `kind` (`tratamiento`, `comunicaciones`, `imagen`, `menores`)
- `consent_version` (FK a `clinic_consents`)
- `granted boolean`
- `granted_at`, `granted_ip`, `granted_user_agent`
- `signature_image_url` (opcional)
- `withdrawn_at` (si retira el consentimiento)

**`clinic_consents`** (textos versionados de la clínica)
- `clinic_id`, `kind`, `version int`, `title`, `body_markdown`, `created_at`, `is_current`.

### 4.4 Citas

**`appointments`**
- `clinic_id`
- `patient_id`, `professional_id`, `room_id` (nullable: una cita puede no requerir sala)
- `service_type_id`
- `starts_at timestamptz`, `ends_at timestamptz`
- `status` enum (`scheduled`, `confirmed`, `checked_in`, `completed`, `no_show`, `cancelled`)
- `notes_for_reception` (visible para recepción/admin/fisio, no clínico)
- `cancel_reason`, `cancelled_by`, `cancelled_at`
- `created_by`, `created_at`, `updated_at`

**Constraint anti-solapamiento (Postgres)**

```sql
alter table appointments
  add constraint appointment_no_overlap_per_professional
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show'));

alter table appointments
  add constraint appointment_no_overlap_per_room
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (room_id is not null and status not in ('cancelled', 'no_show'));
```

Requiere extensión `btree_gist`.

### 4.5 Historia clínica

**`clinical_records`** (una por paciente)
- `patient_id` UNIQUE, `clinic_id`
- `chief_complaint` (motivo de consulta)
- `diagnosis`
- `medical_history` (antecedentes)
- `current_medication`
- `allergies`
- `red_flags` (banderas rojas / contraindicaciones)
- `objectives` (objetivos del tratamiento)
- `created_at`, `updated_at`, `updated_by`

**`session_notes`**
- `clinic_id`, `appointment_id` UNIQUE, `clinical_record_id`
- `subjective` (S de SOAP — lo que cuenta el paciente)
- `objective` (O — exploración, mediciones)
- `assessment` (A — valoración)
- `plan` (P — plan)
- `techniques jsonb` (array de técnicas aplicadas)
- `home_program` (pauta para casa, free text)
- `pain_pre int check (between 0 and 10)`, `pain_post int check (between 0 and 10)` (EVA)
- `author_id`, `created_at`, `updated_at`

### 4.6 Documentos

**`documents`**
- `clinic_id`, `patient_id`
- `kind` (`informe`, `prueba_imagen`, `consentimiento`, `receta`, `otro`)
- `filename`, `mime`, `size_bytes`
- `storage_path` (ruta en bucket privado, formato `clinic_<id>/patient_<id>/<uuid>.<ext>`)
- `uploaded_by`, `uploaded_at`
- `notes`

Bucket de Supabase Storage: `patient-documents`, **privado**, acceso vía signed URLs con TTL corto (60s).

### 4.7 Recordatorios

**`reminder_templates`**
- `clinic_id`, `name`, `channel` (`email`, `inapp`), `subject_template`, `body_template`, `is_active`.
- Plantillas semilla: "Confirmación de cita", "Recordatorio 24h", "Recordatorio 2h".

**`appointment_reminders`**
- `appointment_id`, `template_id`, `channel`, `scheduled_at`
- `status` (`pending`, `sent`, `failed`, `cancelled`)
- `provider_message_id`, `error_message`, `sent_at`
- `payload_snapshot jsonb` (texto realmente enviado, para auditoría)

Generación: al crear / mover una cita, un trigger Postgres encola los recordatorios pendientes basándose en la configuración de la clínica. El envío real se hará vía un job (Vercel Cron + endpoint API que llama a Resend) — **incluido como esqueleto en este MVP, activable cuando se conecte Resend**.

### 4.8 Auditoría

**`audit_logs`** (append-only, sin updates)
- `clinic_id`
- `actor_user_id` (puede ser null si es sistema)
- `action` (`view`, `create`, `update`, `delete`, `export`, `login`, `consent_grant`, `consent_withdraw`)
- `entity_type` (nombre de la tabla)
- `entity_id`
- `entity_owner_id` (p.ej. `patient_id` del que se vio una nota)
- `metadata jsonb`
- `ip`, `user_agent`
- `at timestamptz default now()`

Las lecturas de `clinical_records`, `session_notes`, `documents` y `patients` (vista detallada) **deben** generar un `audit_log` automáticamente vía wrapper en la capa `lib/db/`.

---

## 5. Autenticación y control de acceso

- **Supabase Auth** con email + password como mecanismo principal.
- Reset de contraseña vía email.
- Magic link como opción futura (no en MVP).
- Confirmación de email obligatoria.

### Onboarding

1. Una persona se registra → crea cuenta en Supabase Auth.
2. Al primer login sin clínica asociada, se le redirige a `/onboarding/clinica` donde da de alta su clínica (nombre, CIF, dirección, zona horaria).
3. Al crear la clínica, el sistema crea automáticamente un `clinic_members` con role `admin` para ese usuario.
4. Quedan pre-creados los `service_types` semilla y un `room` "Consulta 1".

### Invitación de miembros

- Un admin invita por email a un fisio o recepcionista.
- Se crea una invitación pendiente; al aceptarla, se crea (o asocia) el usuario y se inserta el `clinic_members`.

### Guardas en UI (middleware + layouts)

- `middleware.ts`: verifica sesión Supabase, redirige a `/login` si no hay; verifica que `active_clinic_id` esté en `clinic_members` del usuario.
- En el layout de cada sección se ejerce el control de rol (`requireRole('admin')`, etc.). La autoridad real es la RLS; esto es UX.

---

## 6. Cumplimiento RGPD (data-level desde día 1)

Lo que la spec marca como "no opcional":

- **HTTPS** en todas las capas (Vercel + Supabase nativos).
- **Datos en UE**: Supabase project debe crearse en región Frankfurt (`eu-central-1`).
- **Cifrado en reposo**: nativo de Supabase Postgres. Adicionalmente, columnas `dni` y `diagnosis` pueden envolverse con `pgsodium` (decisión opcional; se puede activar después sin cambio de modelo).
- **Audit log obligatorio** en todo acceso a `clinical_records`, `session_notes`, `documents`, vista detallada de `patients`.
- **Consentimientos versionados** con `granted_ip`, `granted_at`, `consent_version`. El texto del consentimiento vivo está en `clinic_consents` y es inmutable una vez publicado (nuevas versiones → nueva fila).
- **Derecho al olvido**: función SQL `anonymize_patient(patient_id)` que:
  - Sustituye nombre/apellidos/email/teléfono/DNI por valores hash.
  - Borra documentos del Storage.
  - Marca `deleted_at`.
  - Deja huérfana la historia clínica (necesaria para defensa de obligaciones de la clínica).
  - Inserta un `audit_log` `delete` con `metadata.anonymized = true`.
- **Política de privacidad y aviso legal** visibles en footer del panel.
- **DPO** (Delegado de Protección de Datos): no se construye en código; se reserva un campo `dpo_contact` en `clinics`.
- **Backups**: configuración operativa de Supabase, fuera del scope de código.

---

## 7. Arquitectura de la aplicación

### Estructura de carpetas

```
Fisio/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── reset/page.tsx
│   │   ├── onboarding/clinica/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (panel)/
│   │   ├── layout.tsx                ← nav lateral + selector de clínica
│   │   ├── page.tsx                  ← dashboard (hoy / próximos / KPIs)
│   │   ├── agenda/page.tsx           ← calendario
│   │   ├── agenda/[id]/page.tsx      ← detalle de cita
│   │   ├── pacientes/
│   │   │   ├── page.tsx              ← lista + buscador
│   │   │   ├── nuevo/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx          ← ficha + historia
│   │   │       ├── sesiones/page.tsx ← histórico de notas
│   │   │       └── documentos/page.tsx
│   │   ├── personal/
│   │   │   ├── fisios/page.tsx
│   │   │   ├── salas/page.tsx
│   │   │   ├── servicios/page.tsx
│   │   │   └── miembros/page.tsx
│   │   ├── recordatorios/page.tsx    ← plantillas + log
│   │   └── ajustes/
│   │       ├── clinica/page.tsx
│   │       ├── consentimientos/page.tsx
│   │       └── seguridad/page.tsx    ← audit log
│   ├── api/
│   │   ├── reminders/dispatch/route.ts   ← endpoint cron
│   │   └── webhooks/resend/route.ts      ← futuro
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/              ← shadcn primitives
│   ├── agenda/
│   │   ├── CalendarView.tsx
│   │   ├── AppointmentDialog.tsx
│   │   ├── AppointmentStatusBadge.tsx
│   │   └── ResourceFilter.tsx
│   ├── patient/
│   │   ├── PatientForm.tsx
│   │   ├── ClinicalRecordForm.tsx
│   │   ├── SessionNoteEditor.tsx
│   │   ├── DocumentUploader.tsx
│   │   └── ConsentSignature.tsx
│   ├── clinic/
│   │   ├── ClinicSwitcher.tsx
│   │   ├── ProfessionalForm.tsx
│   │   └── RoomForm.tsx
│   └── shared/
│       ├── PageHeader.tsx
│       ├── EmptyState.tsx
│       ├── DataTable.tsx
│       └── ConfirmDialog.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts        ← createServerClient (con cookies)
│   │   ├── browser.ts       ← createBrowserClient
│   │   └── service.ts       ← service role (solo para Cron / webhooks)
│   ├── auth/
│   │   ├── session.ts       ← getSession, requireSession
│   │   ├── clinic-context.ts ← getActiveClinic, requireClinic
│   │   └── guards.ts        ← requireRole
│   ├── db/
│   │   ├── patients.ts
│   │   ├── appointments.ts
│   │   ├── clinical-records.ts
│   │   ├── session-notes.ts
│   │   ├── documents.ts
│   │   ├── reminders.ts
│   │   └── members.ts
│   ├── domain/
│   │   ├── appointment-rules.ts   ← validaciones puras (no-overlap, estados)
│   │   ├── reminder-scheduler.ts  ← cálculo de cuándo enviar
│   │   └── consents.ts
│   ├── audit/
│   │   └── log.ts          ← writeAudit({action, entity, ...})
│   └── utils/
│       ├── dates.ts
│       ├── format.ts
│       └── types.ts        ← tipos compartidos
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls.sql
│   │   ├── 0003_constraints.sql
│   │   ├── 0004_audit.sql
│   │   ├── 0005_storage.sql
│   │   ├── 0006_seed_service_types.sql
│   │   └── 0007_anonymize_function.sql
│   └── seed.sql
├── middleware.ts
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### Reglas de organización

- **Server Components por defecto**. Solo se marca `'use client'` lo imprescindible (formularios, calendario, modales con estado).
- **Queries tipadas** en `lib/db/`. Nunca se llama a Supabase directamente desde un componente; siempre a través de un módulo de `lib/db/`.
- **Wrapper de audit log**: en `lib/db/`, las funciones de lectura/escritura sobre datos clínicos ejecutan `writeAudit` en el mismo "request scope".
- **Reglas de negocio puras** en `lib/domain/`, sin dependencias de Supabase — testeables con vitest.
- **API routes** sólo para webhooks y cron. La UI usa Server Actions o lecturas directas en Server Components.

---

## 8. UX y diseño visual

- **Paleta**: la del documento origen (azul `#1f6feb` / azul oscuro `#0d3b8c`, fondo claro `#f7f9fc`, tinta `#1a1f2b`, gris `#5b6472`, verde `#1a9c6b`, ámbar `#c77700`, rojo `#c0392b`). Theming vía CSS variables de shadcn.
- **Tipografía**: stack del sistema (`-apple-system, "Segoe UI", Roboto…`).
- **Layout**: sidebar fijo en escritorio (≥ lg); colapsable en tablet; bottom-nav en móvil.
- **Densidad**: alta en tablas y calendario; baja en formularios clínicos (lectura cómoda).
- **Accesibilidad**: targets de Radix; foco siempre visible; etiquetas en español.
- **Vacíos**: `EmptyState` con call-to-action contextual en todas las listas.

---

## 9. Validaciones y reglas de negocio

### Citas

- `ends_at > starts_at`.
- Duración por defecto = `service_types.duration_minutes`; ajustable a mano.
- No se puede crear cita en estado distinto de `scheduled` o `confirmed`.
- Transiciones de estado válidas:
  - `scheduled` → `confirmed | cancelled | no_show`
  - `confirmed` → `checked_in | cancelled | no_show`
  - `checked_in` → `completed | cancelled`
  - `completed` → (terminal, salvo reapertura por admin)
  - `cancelled`, `no_show` → terminal
- `cancel_reason` obligatorio si `cancelled`.
- Cliente intenta validar overlap antes de enviar; servidor lo refuerza vía constraint Postgres (fuente de verdad).
- Al cambiar `starts_at` / `ends_at` / `professional_id`, se cancelan los `appointment_reminders` pendientes y se re-encolan.

### Historia clínica

- Sólo `physio` o `admin` pueden leer/editar `clinical_records` y `session_notes`. `reception` recibe 403.
- `session_notes.appointment_id` único: una cita tiene como mucho una nota.
- Una nota sólo se puede crear si la cita está en estado `completed` o `checked_in`.

### Pacientes

- Recepción y fisio pueden dar de alta. Sólo admin puede borrar (anonimizar).
- El consentimiento de tratamiento es **bloqueante**: no se permite registrar nota de sesión sin que el paciente tenga consentimiento de tratamiento vigente.

### Recordatorios

- Por defecto la clínica configura: confirmación al crear cita, recordatorio 24h antes, recordatorio 2h antes.
- Si el paciente no tiene consentimiento `comunicaciones`, no se programan recordatorios.
- El job de envío corre cada 5 minutos y procesa todos los `pending` con `scheduled_at <= now()`.

---

## 10. Requisitos no funcionales

- **Responsive**: el panel funciona en escritorio y tablet (≥ 768px). Móvil queda razonable pero el uso principal es desde tablet/PC.
- **Rendimiento**: calendario abre < 1s con 500 citas en vista de semana.
- **Seguridad**:
  - HTTPS forzado, `Strict-Transport-Security`.
  - CSP estricta (sin `unsafe-inline` excepto lo mínimo necesario para Next).
  - Cookies `httpOnly`, `secure`, `sameSite=lax`.
  - Rate limit en `/login` y `/signup` (Supabase nativo).
- **Disponibilidad**: SLA dependiente de Vercel + Supabase; sin requisitos extra.
- **i18n**: textos en `messages/es.json`. Estructura `next-intl` lista para añadir idiomas.

---

## 11. Setup y despliegue

### Local

1. `pnpm install`
2. Copiar `.env.example` → `.env.local` y rellenar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. `pnpm supabase:migrate` (aplica migraciones a la BBDD apuntada por las env vars).
4. `pnpm dev` → `http://localhost:3000`.

### Supabase (manual, una vez)

- Crear proyecto en región Frankfurt.
- Habilitar extensiones: `pgcrypto`, `btree_gist`.
- Ejecutar migraciones de `supabase/migrations/` en orden.
- Crear bucket `patient-documents` (privado).
- Crear plantilla de email "Reset password" en castellano.

### Vercel

- Importar el repo.
- Variables de entorno como en `.env.example`.
- Añadir Cron Job: `*/5 * * * *` (cada 5 minutos) → `POST /api/reminders/dispatch` (Authorization: Bearer `CRON_SECRET`).

---

## 12. Decisiones cerradas (de la sección 10 del documento origen)

| Decisión | Resolución |
|---|---|
| ¿Una sola clínica o varias (SaaS)? | **Multi-cl​ínica desde el día 1.** Confirmado por el usuario el 2026-06-09. |
| ¿App móvil nativa o web responsive? | **Web responsive.** Móvil nativo fuera de MVP. |
| ¿WhatsApp en MVP? | **No.** Sólo email; WhatsApp queda para fase posterior (requiere plantillas Meta y coste por mensaje). |
| ¿Reserva online de paciente? | **No en MVP** (queda para F4). |
| ¿Responsable de protección de datos? | Campo `dpo_contact` en `clinics`; la designación real es operativa, no técnica. |
| ¿Modelo de negocio (cuota)? | Fuera del MVP; F5. |

---

## 13. Riesgos y cosas que no se resuelven aquí

- **Disponibilidad de FullCalendar**: la versión libre cubre las vistas necesarias. Si se quiere "resource timeline" hace falta licencia Pro (decisión a tomar en F5 o si la clínica lo pide).
- **Coste de Resend y WhatsApp**: cuando se conecten realmente, hay que decidir qué clínica paga qué.
- **Backups y disaster recovery**: dependientes del plan de Supabase elegido.
- **Asesor RGPD real**: el código cumple los requisitos técnicos, pero validar contractualmente con un DPO sigue siendo responsabilidad del producto.

---

## 14. Criterios de aceptación del MVP

El MVP se considera entregado cuando:

1. Un usuario puede crear cuenta, dar de alta su clínica y configurar fisios/salas/servicios.
2. Puede gestionar pacientes con consentimientos versionados.
3. Puede crear, mover, cancelar y completar citas desde un calendario con drag&drop, sin solapamientos.
4. Cada cita completada puede tener una nota de sesión SOAP.
5. Cada paciente tiene historia clínica única y puede subir documentos al bucket seguro.
6. Los recordatorios se generan al crear citas y quedan listados con su estado (envío real opcional).
7. Cualquier acceso a datos clínicos queda en `audit_logs`.
8. La RLS impide a la clínica A ver datos de la clínica B (verificable con tests SQL).
9. El proyecto se despliega en Vercel con Supabase EU.

---

## 15. Siguiente paso

Pasar a `superpowers:writing-plans` para producir el plan de implementación step-by-step con TDD donde aplique.
