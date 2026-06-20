-- supabase/migrations/0008_storage.sql

-- Bucket privado para documentos de paciente
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  20 * 1024 * 1024,  -- 20 MB
  array[
    'image/png', 'image/jpeg', 'image/webp', 'application/pdf'
  ]
) on conflict (id) do nothing;

-- Política: usuarios autenticados con rol clínico pueden leer
-- los archivos cuyo path empieza por 'clinic_<id>/' donde <id> es una clínica suya
create policy "patient_documents_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'patient-documents'
  and (
    -- prefijo del path es 'clinic_<uuid>/...'
    -- comprobamos contra current_user_clinic_ids()
    split_part(name, '/', 1) like 'clinic_%'
    and (substr(split_part(name, '/', 1), 8))::uuid in (select current_user_clinic_ids())
    and current_user_role(
      (substr(split_part(name, '/', 1), 8))::uuid
    ) in ('admin', 'physio')
  )
);

create policy "patient_documents_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'patient-documents'
  and split_part(name, '/', 1) like 'clinic_%'
  and (substr(split_part(name, '/', 1), 8))::uuid in (select current_user_clinic_ids())
  and current_user_role(
    (substr(split_part(name, '/', 1), 8))::uuid
  ) in ('admin', 'physio')
);

create policy "patient_documents_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'patient-documents'
  and split_part(name, '/', 1) like 'clinic_%'
  and (substr(split_part(name, '/', 1), 8))::uuid in (select current_user_clinic_ids())
  and current_user_role(
    (substr(split_part(name, '/', 1), 8))::uuid
  ) = 'admin'
);
