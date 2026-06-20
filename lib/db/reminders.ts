import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function listPendingReminders(clinicId: string, limit = 100) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("appointment_reminders")
    .select(`
      id, channel, scheduled_at, status, sent_at, error_message,
      appointments(starts_at, patients(first_name, last_name), professionals(display_name))
    `)
    .eq("clinic_id", clinicId)
    .order("scheduled_at", { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function listTemplates(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("reminder_templates")
    .select("id, name, channel, subject_template, body_template, is_active")
    .eq("clinic_id", clinicId)
  if (error) throw error
  return data ?? []
}

export async function upsertTemplate(input: {
  id?: string
  clinic_id: string
  name: string
  channel: "email" | "inapp"
  subject_template?: string | null
  body_template: string
  is_active?: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("reminder_templates").upsert(input)
  if (error) throw error
}
