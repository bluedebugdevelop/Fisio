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
