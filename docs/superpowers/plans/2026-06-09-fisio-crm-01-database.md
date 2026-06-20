# Fisio CRM — Fase 1: Base de datos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Definir el schema completo del MVP, RLS multi-tenant, constraints anti-solapamiento, tipos generados de Supabase y semillas mínimas.

**Architecture:** Migraciones SQL versionadas en `supabase/migrations/`. Cada migración es idempotente (`if not exists`) cuando es razonable. RLS se define en archivos separados de las tablas para mantener legibilidad. Tipos TypeScript se generan con `supabase gen types`.

**Tech Stack:** Supabase CLI, PostgreSQL 15+, pgcrypto, btree_gist, pgsodium (opcional).

---

## Pre-requisito

El usuario debe haber creado el proyecto Supabase en región Frankfurt (`eu-central-1`) y rellenado `.env.local` con sus claves reales. Si todavía no lo ha hecho, paramos esta fase y se lo pedimos.

Verificar antes de empezar:

```bash
grep -E "NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY" .env.local | grep -v dummy
```

Si la salida está vacía o aparecen valores `dummy`, **pausa la ejecución** y pide al usuario que cree el proyecto Supabase y rellene `.env.local`.

---

## Task 1.1: Instalar Supabase CLI y enlazar el proyecto

**Files:**
- Create: `supabase/config.toml`

- [ ] **Step 1: Instalar Supabase CLI**

```bash
pnpm add -D supabase
```

- [ ] **Step 2: Inicializar Supabase**

```bash
pnpm dlx supabase init
```

Esto crea `supabase/config.toml`. Si pregunta sobre VS Code o IntelliJ, decir "no".

- [ ] **Step 3: Enlazar al proyecto remoto**

Pedir al usuario el `project-ref` (parte del URL `https://<ref>.supabase.co`).

```bash
pnpm dlx supabase link --project-ref <REF>
```

Pedirá la contraseña de la base de datos (la del proyecto Supabase).

- [ ] **Step 4: Commit**

```bash
git add supabase/config.toml supabase/.gitignore .gitignore package.json pnpm-lock.yaml
git commit -m "chore: link Supabase project"
```

---

## Task 1.2: Migración inicial — extensiones, enums, tablas tenant

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Crear la migración**

```sql
-- supabase/migrations/0001_init.sql

-- Extensiones
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- Enums
create type member_role as enum ('admin', 'physio', 'reception');
create type appointment_status as enum (
  'scheduled', 'confirmed', 'checked_in', 'completed', 'no_show', 'cancelled'
);
create type room_kind as enum ('consulta', 'box', 'gimnasio', 'otro');
create type consent_kind as enum ('tratamiento', 'comunicaciones', 'imagen', 'menores');
create type reminder_channel as enum ('email', 'inapp');
create type reminder_status as enum ('pending', 'sent', 'failed', 'cancelled');
create type document_kind as enum ('informe', 'prueba_imagen', 'consentimiento', 'receta', 'otro');
create type audit_action as enum (
  'view', 'create', 'update', 'delete', 'export',
  'login', 'logout', 'consent_grant', 'consent_withdraw'
);

-- Tabla: clinics
create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  cif text,
  address text,
  city text,
  postal_code text,
  country text not null default 'es',
  timezone text not null default 'Europe/Madrid',
  phone text,
  email text,
  logo_url text,
  dpo_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla: clinic_members
create table clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null,
  is_active boolean not null default true,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

create index clinic_members_user_idx on clinic_members(user_id);
create index clinic_members_clinic_idx on clinic_members(clinic_id);

-- Tabla: clinic_invitations
create table clinic_invitations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  email text not null,
  role member_role not null,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index clinic_invitations_email_idx on clinic_invitations(email);
```

- [ ] **Step 2: Aplicar la migración**

```bash
pnpm dlx supabase db push
```

Esperado: "Applied 0001_init.sql".

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): clinics, members and invitations"
```

---

## Task 1.3: Migración — recursos de la clínica (profesionales, salas, servicios)

**Files:**
- Create: `supabase/migrations/0002_clinic_resources.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/0002_clinic_resources.sql

create table professionals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  license_number text,
  specialty text,
  display_name text not null,
  color text not null default '#1f6feb',
  default_appointment_minutes int not null default 45 check (default_appointment_minutes between 5 and 480),
  weekly_schedule jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

create index professionals_clinic_idx on professionals(clinic_id);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  kind room_kind not null default 'consulta',
  capacity int not null default 1 check (capacity > 0),
  color text not null default '#94a3b8',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index rooms_clinic_idx on rooms(clinic_id);

create table service_types (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes between 5 and 480),
  color text not null default '#1f6feb',
  price_cents int check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index service_types_clinic_idx on service_types(clinic_id);
```

- [ ] **Step 2: Aplicar y commitear**

```bash
pnpm dlx supabase db push
git add supabase/migrations/0002_clinic_resources.sql
git commit -m "feat(db): professionals, rooms, service_types"
```

---

## Task 1.4: Migración — pacientes y consentimientos

**Files:**
- Create: `supabase/migrations/0003_patients.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/0003_patients.sql

create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  dni text,
  birth_date date,
  gender text check (gender in ('f', 'm', 'x', 'none')),
  phone text,
  email text,
  address text,
  city text,
  postal_code text,
  notes_admin text,
  referred_by text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index patients_clinic_dni_uniq
  on patients(clinic_id, dni) where dni is not null and deleted_at is null;

create index patients_clinic_idx on patients(clinic_id);
create index patients_clinic_name_idx
  on patients(clinic_id, last_name, first_name) where deleted_at is null;

create table clinic_consents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  kind consent_kind not null,
  version int not null,
  title text not null,
  body_markdown text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (clinic_id, kind, version)
);

create unique index clinic_consents_one_current
  on clinic_consents(clinic_id, kind) where is_current;

create table patient_consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  consent_id uuid not null references clinic_consents(id),
  granted boolean not null,
  granted_at timestamptz not null default now(),
  granted_ip text,
  granted_user_agent text,
  signature_image_url text,
  withdrawn_at timestamptz
);

create index patient_consents_patient_idx on patient_consents(patient_id);
```

- [ ] **Step 2: Aplicar y commitear**

```bash
pnpm dlx supabase db push
git add supabase/migrations/0003_patients.sql
git commit -m "feat(db): patients and consents"
```

---

## Task 1.5: Migración — citas con anti-solapamiento

**Files:**
- Create: `supabase/migrations/0004_appointments.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/0004_appointments.sql

create table appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete restrict,
  professional_id uuid not null references professionals(id) on delete restrict,
  room_id uuid references rooms(id) on delete set null,
  service_type_id uuid references service_types(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'scheduled',
  notes_for_reception text,
  cancel_reason text,
  cancelled_by uuid references auth.users(id),
  cancelled_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index appointments_clinic_starts_idx
  on appointments(clinic_id, starts_at);
create index appointments_patient_idx on appointments(patient_id);
create index appointments_professional_idx on appointments(professional_id);

-- Constraint anti-solapamiento por profesional (ignora canceladas y no-show)
alter table appointments
  add constraint appointment_no_overlap_per_professional
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show'));

-- Constraint anti-solapamiento por sala (cuando hay sala asignada)
alter table appointments
  add constraint appointment_no_overlap_per_room
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (room_id is not null and status not in ('cancelled', 'no_show'));
```

- [ ] **Step 2: Aplicar y verificar con test SQL**

```bash
pnpm dlx supabase db push
```

Verificar que el constraint funciona conectando a la BD (psql o el SQL editor de Supabase) y ejecutando:

```sql
-- Setup mínimo
insert into clinics(name) values ('Test') returning id;
-- Anotar el id, vamos a llamarlo CID

insert into auth.users(id, email) values (gen_random_uuid(), 'a@a.com') returning id;
-- Anotar UID

insert into clinic_members(clinic_id, user_id, role)
  values ('CID', 'UID', 'physio') returning id;
insert into professionals(clinic_id, user_id, display_name)
  values ('CID', 'UID', 'Test') returning id;
-- Anotar PID

insert into patients(clinic_id, first_name, last_name)
  values ('CID', 'X', 'X') returning id;
-- Anotar PaID

-- Primera cita
insert into appointments(clinic_id, patient_id, professional_id, starts_at, ends_at)
  values ('CID', 'PaID', 'PID', '2026-06-10 10:00:00+00', '2026-06-10 11:00:00+00');

-- Segunda cita solapando — debe FALLAR
insert into appointments(clinic_id, patient_id, professional_id, starts_at, ends_at)
  values ('CID', 'PaID', 'PID', '2026-06-10 10:30:00+00', '2026-06-10 11:30:00+00');
-- Error esperado: conflicting key value violates exclusion constraint
```

Limpiar tras la verificación:

```sql
delete from appointments where clinic_id = 'CID';
delete from professionals where clinic_id = 'CID';
delete from patients where clinic_id = 'CID';
delete from clinic_members where clinic_id = 'CID';
delete from clinics where id = 'CID';
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_appointments.sql
git commit -m "feat(db): appointments with anti-overlap exclusion constraints"
```

---

## Task 1.6: Migración — historia clínica, notas de sesión, documentos

**Files:**
- Create: `supabase/migrations/0005_clinical.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/0005_clinical.sql

create table clinical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  chief_complaint text,
  diagnosis text,
  medical_history text,
  current_medication text,
  allergies text,
  red_flags text,
  objectives text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (patient_id)
);

create index clinical_records_clinic_idx on clinical_records(clinic_id);

create table session_notes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  clinical_record_id uuid not null references clinical_records(id) on delete cascade,
  subjective text,
  objective text,
  assessment text,
  plan text,
  techniques jsonb not null default '[]'::jsonb,
  home_program text,
  pain_pre int check (pain_pre between 0 and 10),
  pain_post int check (pain_post between 0 and 10),
  author_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id)
);

create index session_notes_record_idx on session_notes(clinical_record_id);
create index session_notes_clinic_idx on session_notes(clinic_id);

create table documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  kind document_kind not null default 'otro',
  filename text not null,
  mime text not null,
  size_bytes bigint not null,
  storage_path text not null unique,
  notes text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now()
);

create index documents_patient_idx on documents(patient_id);
create index documents_clinic_idx on documents(clinic_id);
```

- [ ] **Step 2: Aplicar y commitear**

```bash
pnpm dlx supabase db push
git add supabase/migrations/0005_clinical.sql
git commit -m "feat(db): clinical records, session notes, documents"
```

---

## Task 1.7: Migración — recordatorios y audit log

**Files:**
- Create: `supabase/migrations/0006_reminders_audit.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/0006_reminders_audit.sql

create table reminder_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  channel reminder_channel not null,
  subject_template text,
  body_template text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index reminder_templates_clinic_idx on reminder_templates(clinic_id);

create table appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  template_id uuid references reminder_templates(id) on delete set null,
  channel reminder_channel not null,
  scheduled_at timestamptz not null,
  status reminder_status not null default 'pending',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  payload_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index appointment_reminders_status_scheduled_idx
  on appointment_reminders(status, scheduled_at) where status = 'pending';
create index appointment_reminders_appointment_idx
  on appointment_reminders(appointment_id);

create table audit_logs (
  id bigserial primary key,
  clinic_id uuid references clinics(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action audit_action not null,
  entity_type text not null,
  entity_id uuid,
  entity_owner_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  at timestamptz not null default now()
);

create index audit_logs_clinic_at_idx on audit_logs(clinic_id, at desc);
create index audit_logs_entity_idx on audit_logs(entity_type, entity_id);
```

- [ ] **Step 2: Aplicar y commitear**

```bash
pnpm dlx supabase db push
git add supabase/migrations/0006_reminders_audit.sql
git commit -m "feat(db): reminders and audit log"
```

---

## Task 1.8: Helper RLS y políticas de aislamiento por clínica

**Files:**
- Create: `supabase/migrations/0007_rls.sql`

- [ ] **Step 1: Crear migración con helper + activación de RLS + políticas básicas**

```sql
-- supabase/migrations/0007_rls.sql

-- Helper: clínicas a las que pertenece el usuario actual
create or replace function public.current_user_clinic_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from clinic_members
  where user_id = auth.uid() and is_active = true
$$;

revoke all on function public.current_user_clinic_ids() from public;
grant execute on function public.current_user_clinic_ids() to authenticated;

-- Helper: rol del usuario en una clínica concreta
create or replace function public.current_user_role(target_clinic uuid)
returns member_role
language sql
stable
security definer
set search_path = public
as $$
  select role from clinic_members
  where user_id = auth.uid() and clinic_id = target_clinic and is_active = true
  limit 1
$$;

grant execute on function public.current_user_role(uuid) to authenticated;

-- Habilitar RLS en todas las tablas multi-tenant
alter table clinics enable row level security;
alter table clinic_members enable row level security;
alter table clinic_invitations enable row level security;
alter table professionals enable row level security;
alter table rooms enable row level security;
alter table service_types enable row level security;
alter table patients enable row level security;
alter table clinic_consents enable row level security;
alter table patient_consents enable row level security;
alter table appointments enable row level security;
alter table clinical_records enable row level security;
alter table session_notes enable row level security;
alter table documents enable row level security;
alter table reminder_templates enable row level security;
alter table appointment_reminders enable row level security;
alter table audit_logs enable row level security;

-- ============================================================
-- clinics: ver sólo las clínicas a las que pertenezco
-- ============================================================
create policy clinics_select on clinics for select to authenticated
  using (id in (select current_user_clinic_ids()));

create policy clinics_insert on clinics for insert to authenticated
  with check (true);  -- onboarding: cualquier user autenticado puede crear su clínica

create policy clinics_update on clinics for update to authenticated
  using (current_user_role(id) = 'admin')
  with check (current_user_role(id) = 'admin');

-- ============================================================
-- clinic_members
-- ============================================================
create policy clinic_members_select on clinic_members for select to authenticated
  using (
    user_id = auth.uid()
    or current_user_role(clinic_id) in ('admin')
  );

create policy clinic_members_insert on clinic_members for insert to authenticated
  with check (
    -- Sólo admins de la clínica, o caso onboarding (primer miembro)
    current_user_role(clinic_id) = 'admin'
    or not exists (select 1 from clinic_members where clinic_id = clinic_members.clinic_id)
  );

create policy clinic_members_update on clinic_members for update to authenticated
  using (current_user_role(clinic_id) = 'admin')
  with check (current_user_role(clinic_id) = 'admin');

create policy clinic_members_delete on clinic_members for delete to authenticated
  using (current_user_role(clinic_id) = 'admin');

-- ============================================================
-- Política genérica de tenant: helper como macro
-- ============================================================
-- Para cada tabla con clinic_id, aplicamos:
--   SELECT: miembros de esa clínica
--   INSERT/UPDATE/DELETE: con restricciones por rol según tabla

-- professionals
create policy professionals_tenant_select on professionals for select to authenticated
  using (clinic_id in (select current_user_clinic_ids()));
create policy professionals_admin_write on professionals for all to authenticated
  using (current_user_role(clinic_id) = 'admin')
  with check (current_user_role(clinic_id) = 'admin');

-- rooms
create policy rooms_tenant_select on rooms for select to authenticated
  using (clinic_id in (select current_user_clinic_ids()));
create policy rooms_admin_write on rooms for all to authenticated
  using (current_user_role(clinic_id) = 'admin')
  with check (current_user_role(clinic_id) = 'admin');

-- service_types
create policy service_types_tenant_select on service_types for select to authenticated
  using (clinic_id in (select current_user_clinic_ids()));
create policy service_types_admin_write on service_types for all to authenticated
  using (current_user_role(clinic_id) = 'admin')
  with check (current_user_role(clinic_id) = 'admin');

-- patients: admin/physio/reception pueden leer. Reception no ve detalle clínico (otras tablas)
create policy patients_tenant_select on patients for select to authenticated
  using (clinic_id in (select current_user_clinic_ids()));
create policy patients_staff_write on patients for all to authenticated
  using (current_user_role(clinic_id) in ('admin', 'physio', 'reception'))
  with check (current_user_role(clinic_id) in ('admin', 'physio', 'reception'));

-- clinic_consents
create policy clinic_consents_tenant_select on clinic_consents for select to authenticated
  using (clinic_id in (select current_user_clinic_ids()));
create policy clinic_consents_admin_write on clinic_consents for all to authenticated
  using (current_user_role(clinic_id) = 'admin')
  with check (current_user_role(clinic_id) = 'admin');

-- patient_consents
create policy patient_consents_tenant_select on patient_consents for select to authenticated
  using (clinic_id in (select current_user_clinic_ids()));
create policy patient_consents_staff_write on patient_consents for all to authenticated
  using (current_user_role(clinic_id) in ('admin', 'physio', 'reception'))
  with check (current_user_role(clinic_id) in ('admin', 'physio', 'reception'));

-- appointments: todo el staff
create policy appointments_tenant_select on appointments for select to authenticated
  using (clinic_id in (select current_user_clinic_ids()));
create policy appointments_staff_write on appointments for all to authenticated
  using (current_user_role(clinic_id) in ('admin', 'physio', 'reception'))
  with check (current_user_role(clinic_id) in ('admin', 'physio', 'reception'));

-- clinical_records: sólo admin y physio
create policy clinical_records_clinical_select on clinical_records for select to authenticated
  using (
    clinic_id in (select current_user_clinic_ids())
    and current_user_role(clinic_id) in ('admin', 'physio')
  );
create policy clinical_records_clinical_write on clinical_records for all to authenticated
  using (current_user_role(clinic_id) in ('admin', 'physio'))
  with check (current_user_role(clinic_id) in ('admin', 'physio'));

-- session_notes: sólo admin y physio
create policy session_notes_clinical_select on session_notes for select to authenticated
  using (
    clinic_id in (select current_user_clinic_ids())
    and current_user_role(clinic_id) in ('admin', 'physio')
  );
create policy session_notes_clinical_write on session_notes for all to authenticated
  using (current_user_role(clinic_id) in ('admin', 'physio'))
  with check (current_user_role(clinic_id) in ('admin', 'physio'));

-- documents: admin y physio (reception no ve docs clínicos)
create policy documents_clinical_select on documents for select to authenticated
  using (
    clinic_id in (select current_user_clinic_ids())
    and current_user_role(clinic_id) in ('admin', 'physio')
  );
create policy documents_clinical_write on documents for all to authenticated
  using (current_user_role(clinic_id) in ('admin', 'physio'))
  with check (current_user_role(clinic_id) in ('admin', 'physio'));

-- reminder_templates: sólo admin
create policy reminder_templates_select on reminder_templates for select to authenticated
  using (clinic_id in (select current_user_clinic_ids()));
create policy reminder_templates_admin_write on reminder_templates for all to authenticated
  using (current_user_role(clinic_id) = 'admin')
  with check (current_user_role(clinic_id) = 'admin');

-- appointment_reminders: staff lee, sistema escribe via service role
create policy appointment_reminders_tenant_select on appointment_reminders for select to authenticated
  using (clinic_id in (select current_user_clinic_ids()));
-- Insertar/update se hace con service role (dispatch cron) o trigger; no policy para authenticated.

-- audit_logs: sólo admin
create policy audit_logs_admin_select on audit_logs for select to authenticated
  using (
    clinic_id is not null
    and clinic_id in (select current_user_clinic_ids())
    and current_user_role(clinic_id) = 'admin'
  );
-- Inserts vienen del backend (service role) o de definers; no policy para authenticated.

-- clinic_invitations: admin de la clínica
create policy clinic_invitations_select on clinic_invitations for select to authenticated
  using (current_user_role(clinic_id) = 'admin');
create policy clinic_invitations_write on clinic_invitations for all to authenticated
  using (current_user_role(clinic_id) = 'admin')
  with check (current_user_role(clinic_id) = 'admin');
```

- [ ] **Step 2: Aplicar**

```bash
pnpm dlx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_rls.sql
git commit -m "feat(db): RLS policies for multi-tenant isolation and role-based access"
```

---

## Task 1.9: Bucket de Storage para documentos

**Files:**
- Create: `supabase/migrations/0008_storage.sql`

- [ ] **Step 1: Crear migración que define el bucket y sus policies**

```sql
-- supabase/migrations/0008_storage.sql

-- Bucket privado para documentos de paciente
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  20 * 1024 * 1024,  -- 20 MB
  array[
    'image/png', 'image/jpeg', 'image/webp', 'application/pdf'
  ]
) on conflict (id) do nothing;

-- Política: usuarios autenticados con rol clínico pueden leer
-- los archivos cuyo path empieza por 'clinic_<id>/' donde <id> es una clínica suya
create policy "patient_documents_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'patient-documents'
  and (
    -- prefijo del path es 'clinic_<uuid>/...'
    -- comprobamos contra current_user_clinic_ids()
    split_part(name, '/', 1) like 'clinic_%'
    and (substr(split_part(name, '/', 1), 8))::uuid in (select current_user_clinic_ids())
    and current_user_role(
      (substr(split_part(name, '/', 1), 8))::uuid
    ) in ('admin', 'physio')
  )
);

create policy "patient_documents_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'patient-documents'
  and split_part(name, '/', 1) like 'clinic_%'
  and (substr(split_part(name, '/', 1), 8))::uuid in (select current_user_clinic_ids())
  and current_user_role(
    (substr(split_part(name, '/', 1), 8))::uuid
  ) in ('admin', 'physio')
);

create policy "patient_documents_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'patient-documents'
  and split_part(name, '/', 1) like 'clinic_%'
  and (substr(split_part(name, '/', 1), 8))::uuid in (select current_user_clinic_ids())
  and current_user_role(
    (substr(split_part(name, '/', 1), 8))::uuid
  ) = 'admin'
);
```

- [ ] **Step 2: Aplicar y commitear**

```bash
pnpm dlx supabase db push
git add supabase/migrations/0008_storage.sql
git commit -m "feat(db): private patient-documents bucket with tenant RLS"
```

---

## Task 1.10: Triggers de updated_at + onboarding helper + anonymize

**Files:**
- Create: `supabase/migrations/0009_functions_triggers.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/0009_functions_triggers.sql

-- Trigger genérico de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_clinics
  before update on clinics
  for each row execute function set_updated_at();

create trigger set_updated_at_patients
  before update on patients
  for each row execute function set_updated_at();

create trigger set_updated_at_appointments
  before update on appointments
  for each row execute function set_updated_at();

create trigger set_updated_at_clinical_records
  before update on clinical_records
  for each row execute function set_updated_at();

create trigger set_updated_at_session_notes
  before update on session_notes
  for each row execute function set_updated_at();

-- Función de onboarding: crea clínica + admin + seeds básicos en una sola tx
create or replace function public.bootstrap_clinic(
  p_name text,
  p_legal_name text default null,
  p_cif text default null,
  p_address text default null,
  p_city text default null,
  p_postal_code text default null,
  p_phone text default null,
  p_email text default null,
  p_timezone text default 'Europe/Madrid'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into clinics (name, legal_name, cif, address, city, postal_code, phone, email, timezone)
  values (p_name, p_legal_name, p_cif, p_address, p_city, p_postal_code, p_phone, p_email, p_timezone)
  returning id into v_clinic_id;

  insert into clinic_members(clinic_id, user_id, role)
  values (v_clinic_id, auth.uid(), 'admin');

  -- Seeds básicos
  insert into rooms(clinic_id, name) values (v_clinic_id, 'Consulta 1');

  insert into service_types(clinic_id, name, duration_minutes)
  values
    (v_clinic_id, 'Primera consulta', 60),
    (v_clinic_id, 'Sesión de seguimiento', 45),
    (v_clinic_id, 'Punción seca', 30),
    (v_clinic_id, 'Drenaje linfático', 60);

  insert into clinic_consents(clinic_id, kind, version, title, body_markdown, is_current) values
    (v_clinic_id, 'tratamiento', 1, 'Consentimiento de tratamiento',
     'El paciente consiente recibir tratamiento fisioterapéutico en esta clínica.', true),
    (v_clinic_id, 'comunicaciones', 1, 'Comunicaciones de recordatorios',
     'El paciente consiente recibir recordatorios de citas por email.', true);

  insert into reminder_templates(clinic_id, name, channel, subject_template, body_template) values
    (v_clinic_id, 'Confirmación de cita', 'email',
     'Cita confirmada en {{clinic_name}}',
     'Hola {{patient_first_name}}, tu cita está confirmada el {{appointment_date}} a las {{appointment_time}} con {{professional_name}}.'),
    (v_clinic_id, 'Recordatorio 24h', 'email',
     'Recordatorio: cita mañana en {{clinic_name}}',
     'Te recordamos que tienes cita mañana {{appointment_date}} a las {{appointment_time}} con {{professional_name}}.');

  return v_clinic_id;
end;
$$;

revoke all on function public.bootstrap_clinic(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.bootstrap_clinic(text, text, text, text, text, text, text, text, text) to authenticated;

-- Anonimización de paciente (derecho al olvido)
create or replace function public.anonymize_patient(p_patient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic uuid;
begin
  select clinic_id into v_clinic from patients where id = p_patient_id;
  if v_clinic is null then
    raise exception 'patient not found';
  end if;
  if current_user_role(v_clinic) <> 'admin' then
    raise exception 'only admin can anonymize';
  end if;

  update patients set
    first_name = 'Anonimizado',
    last_name = encode(digest(id::text, 'sha256'), 'hex'),
    dni = null,
    birth_date = null,
    phone = null,
    email = null,
    address = null,
    city = null,
    postal_code = null,
    notes_admin = null,
    deleted_at = now(),
    is_active = false
  where id = p_patient_id;

  insert into audit_logs(clinic_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_clinic, auth.uid(), 'delete', 'patients', p_patient_id,
          jsonb_build_object('anonymized', true));
end;
$$;

revoke all on function public.anonymize_patient(uuid) from public;
grant execute on function public.anonymize_patient(uuid) to authenticated;
```

- [ ] **Step 2: Aplicar y commitear**

```bash
pnpm dlx supabase db push
git add supabase/migrations/0009_functions_triggers.sql
git commit -m "feat(db): triggers, bootstrap_clinic and anonymize_patient functions"
```

---

## Task 1.11: Generar tipos TypeScript

**Files:**
- Modify: `lib/supabase/types.ts`
- Modify: `package.json` (script para regenerar)

- [ ] **Step 1: Añadir script de generación de tipos**

Editar `package.json` y añadir en `scripts`:

```json
"db:types": "supabase gen types typescript --linked > lib/supabase/types.ts"
```

- [ ] **Step 2: Generar tipos**

```bash
pnpm db:types
```

Esto sobrescribe `lib/supabase/types.ts` con el tipo `Database` correcto.

- [ ] **Step 3: Verificar typecheck**

```bash
pnpm typecheck
```

Esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts package.json
git commit -m "feat: generate Supabase TypeScript types"
```

---

## Task 1.12: Verificación final de la fase

- [ ] **Step 1: Comprobar listado de tablas**

Ejecutar en el SQL editor de Supabase o vía CLI:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Esperado (orden alfabético):
- appointment_reminders
- appointments
- audit_logs
- clinic_consents
- clinic_invitations
- clinic_members
- clinics
- clinical_records
- documents
- patient_consents
- patients
- professionals
- reminder_templates
- rooms
- service_types
- session_notes

- [ ] **Step 2: Comprobar que RLS está activa en todas**

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public' order by tablename;
```

Todas deben tener `rowsecurity = true`.

- [ ] **Step 3: Tag de fin de fase**

```bash
git tag phase-1-database-complete
```

## Siguiente fase

`2026-06-09-fisio-crm-02-auth.md` — Auth UI, onboarding de clínica e invitaciones.
