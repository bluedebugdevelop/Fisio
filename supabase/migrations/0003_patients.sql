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
