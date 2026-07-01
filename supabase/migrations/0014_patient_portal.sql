-- supabase/migrations/0014_patient_portal.sql

create table patient_accounts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (patient_id),
  unique (user_id, patient_id)
);

create index patient_accounts_user_idx on patient_accounts(user_id);
create index patient_accounts_clinic_idx on patient_accounts(clinic_id);

alter table patient_accounts enable row level security;

create policy patient_accounts_self_select on patient_accounts for select to authenticated
  using (user_id = auth.uid() and is_active = true);

create policy patient_accounts_staff_select on patient_accounts for select to authenticated
  using (current_user_role(clinic_id) in ('admin', 'physio', 'reception'));

create policy patient_accounts_staff_write on patient_accounts for all to authenticated
  using (current_user_role(clinic_id) in ('admin', 'physio', 'reception'))
  with check (current_user_role(clinic_id) in ('admin', 'physio', 'reception'));

create or replace function public.current_patient_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select patient_id from patient_accounts
  where user_id = auth.uid() and is_active = true
$$;

revoke all on function public.current_patient_ids() from public;
grant execute on function public.current_patient_ids() to authenticated;

create policy patients_portal_select on patients for select to authenticated
  using (id in (select current_patient_ids()));

create policy patient_consents_portal_select on patient_consents for select to authenticated
  using (patient_id in (select current_patient_ids()));

create policy appointments_portal_select on appointments for select to authenticated
  using (patient_id in (select current_patient_ids()));

create policy documents_portal_select on documents for select to authenticated
  using (patient_id in (select current_patient_ids()));
