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
