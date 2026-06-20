import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { writeAudit } from "@/lib/audit/log"

export async function listSessionNotes(patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("session_notes")
    .select(`
      id, appointment_id, subjective, objective, assessment, plan,
      techniques, home_program, pain_pre, pain_post, created_at, author_id,
      appointments(starts_at, professional_id, professionals(display_name, color))
    `)
    .eq("clinical_record_id", (await getRecordId(patientId)))
    .order("created_at", { ascending: false })
  if (error) throw error
  await writeAudit({
    action: "view",
    entityType: "session_notes",
    entityOwnerId: patientId,
  })
  return data ?? []
}

async function getRecordId(patientId: string): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinical_records")
    .select("id")
    .eq("patient_id", patientId)
    .single()
  if (error) throw error
  return data.id
}

export async function getSessionNoteByAppointment(appointmentId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("session_notes")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertSessionNote(input: {
  id?: string
  clinic_id: string
  appointment_id: string
  clinical_record_id: string
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  techniques?: string[]
  home_program?: string | null
  pain_pre?: number | null
  pain_post?: number | null
  author_id: string
}) {
  const supabase = await createSupabaseServerClient()
  const payload = { ...input, techniques: input.techniques ?? [] }
  const { error } = await supabase.from("session_notes").upsert(payload, { onConflict: "appointment_id" })
  if (error) throw error
  await writeAudit({
    action: input.id ? "update" : "create",
    entityType: "session_notes",
    entityId: input.appointment_id,
  })
}
