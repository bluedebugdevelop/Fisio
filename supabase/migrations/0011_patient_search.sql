create or replace function public.search_patients(p_clinic uuid, p_query text)
returns table(id uuid, label text)
language sql security definer set search_path = public as $$
  select id,
    (last_name || ', ' || first_name || coalesce(' · ' || dni, '')) as label
  from patients
  where clinic_id = p_clinic
    and deleted_at is null
    and (
      p_query is null or p_query = ''
      or first_name ilike '%' || p_query || '%'
      or last_name ilike '%' || p_query || '%'
      or dni ilike '%' || p_query || '%'
      or phone ilike '%' || p_query || '%'
    )
  order by last_name, first_name
  limit 20
$$;

grant execute on function public.search_patients(uuid, text) to authenticated;
