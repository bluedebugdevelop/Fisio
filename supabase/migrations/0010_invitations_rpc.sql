create or replace function public.get_invitation_preview(p_token text)
returns table(email text, role member_role)
language sql security definer set search_path = public as $$
  select email, role from clinic_invitations
  where token = p_token and accepted_at is null and expires_at > now()
  limit 1
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_inv clinic_invitations%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select * into v_inv from clinic_invitations
  where token = p_token and accepted_at is null and expires_at > now()
  for update;
  if v_inv.id is null then raise exception 'invitation invalid'; end if;

  insert into clinic_members(clinic_id, user_id, role, invited_by)
  values (v_inv.clinic_id, v_user, v_inv.role, v_inv.invited_by)
  on conflict (clinic_id, user_id) do update set role = excluded.role, is_active = true;

  update clinic_invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.clinic_id;
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;
