import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type ProfessionalRow = {
  id: string
  display_name: string
  license_number: string | null
  specialty: string | null
  color: string
  default_appointment_minutes: number
  is_active: boolean
  user_id: string
}

export async function listProfessionals(clinicId: string): Promise<ProfessionalRow[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("professionals")
    .select("id, display_name, license_number, specialty, color, default_appointment_minutes, is_active, user_id")
    .eq("clinic_id", clinicId)
    .order("display_name")
  if (error) throw error
  return (data ?? []) as ProfessionalRow[]
}

export async function upsertProfessional(input: {
  id?: string
  clinic_id: string
  user_id: string
  display_name: string
  license_number?: string | null
  specialty?: string | null
  color?: string
  default_appointment_minutes?: number
  is_active?: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("professionals").upsert(input)
  if (error) throw error
}

export async function setProfessionalActive(id: string, active: boolean) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("professionals").update({ is_active: active }).eq("id", id)
  if (error) throw error
}
