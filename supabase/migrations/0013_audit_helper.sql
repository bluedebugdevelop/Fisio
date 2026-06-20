-- supabase/migrations/0013_audit_helper.sql

create or replace function public.write_audit_log(
  p_action audit_action,
  p_entity_type text,
  p_entity_id uuid default null,
  p_entity_owner_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_clinic uuid;
begin
  if auth.uid() is null then return; end if;
  -- Inferimos clínica activa del usuario si hay solo una; si no, queda null y el insert se hace igualmente.
  select clinic_id into v_clinic
  from clinic_members
  where user_id = auth.uid() and is_active = true
  limit 1;

  insert into audit_logs(clinic_id, actor_user_id, action, entity_type, entity_id, entity_owner_id, metadata)
  values (v_clinic, auth.uid(), p_action, p_entity_type, p_entity_id, p_entity_owner_id, p_metadata);
end;
$$;

grant execute on function public.write_audit_log(audit_action, text, uuid, uuid, jsonb) to authenticated;
