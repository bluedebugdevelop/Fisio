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
