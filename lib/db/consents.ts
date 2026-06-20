import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function listCurrentConsents(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinic_consents")
    .select("id, kind, version, title, body_markdown")
    .eq("clinic_id", clinicId)
    .eq("is_current", true)
  if (error) throw error
  return data ?? []
}

export async function listPatientConsents(patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patient_consents")
    .select("id, consent_id, granted, granted_at, withdrawn_at, clinic_consents(kind, version, title)")
    .eq("patient_id", patientId)
    .order("granted_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function grantConsent(input: {
  patient_id: string
  clinic_id: string
  consent_id: string
  granted: boolean
  granted_ip: string | null
  granted_user_agent: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("patient_consents").insert(input)
  if (error) throw error
}

export async function hasGrantedTreatmentConsent(patientId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patient_consents")
    .select("id, granted, withdrawn_at, clinic_consents!inner(kind, is_current)")
    .eq("patient_id", patientId)
    .eq("granted", true)
    .is("withdrawn_at", null)
    .eq("clinic_consents.kind", "tratamiento")
    .eq("clinic_consents.is_current", true)
    .limit(1)
  if (error) throw error
  return (data ?? []).length > 0
}

export async function hasGrantedCommunicationsConsent(patientId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patient_consents")
    .select("id, granted, withdrawn_at, clinic_consents!inner(kind, is_current)")
    .eq("patient_id", patientId)
    .eq("granted", true)
    .is("withdrawn_at", null)
    .eq("clinic_consents.kind", "comunicaciones")
    .eq("clinic_consents.is_current", true)
    .limit(1)
  if (error) throw error
  return (data ?? []).length > 0
}
