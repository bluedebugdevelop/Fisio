import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { writeAudit } from "@/lib/audit/log"

export async function listDocuments(patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("documents")
    .select("id, kind, filename, mime, size_bytes, storage_path, notes, uploaded_at, uploaded_by")
    .eq("patient_id", patientId)
    .order("uploaded_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function insertDocumentRow(input: {
  clinic_id: string
  patient_id: string
  kind: "informe" | "prueba_imagen" | "consentimiento" | "receta" | "otro"
  filename: string
  mime: string
  size_bytes: number
  storage_path: string
  uploaded_by: string
  notes?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("documents").insert(input)
  if (error) throw error
  await writeAudit({
    action: "create",
    entityType: "documents",
    entityId: input.patient_id,
  })
}

export async function deleteDocument(id: string, storagePath: string) {
  const supabase = await createSupabaseServerClient()
  await supabase.storage.from("patient-documents").remove([storagePath])
  const { error } = await supabase.from("documents").delete().eq("id", id)
  if (error) throw error
  await writeAudit({
    action: "delete",
    entityType: "documents",
    entityId: id,
  })
}

export async function createDocumentSignedUrl(storagePath: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from("patient-documents")
    .createSignedUrl(storagePath, 60)
  if (error) throw error
  await writeAudit({
    action: "view",
    entityType: "documents",
    metadata: { storage_path: storagePath },
  })
  return data.signedUrl
}
