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
