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
