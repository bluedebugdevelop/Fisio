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
