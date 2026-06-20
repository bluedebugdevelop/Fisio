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
