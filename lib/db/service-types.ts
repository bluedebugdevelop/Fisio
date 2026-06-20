import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function listServiceTypes(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("service_types")
    .select("id, name, duration_minutes, color, price_cents, is_active")
    .eq("clinic_id", clinicId)
    .order("name")
  if (error) throw error
  return data ?? []
}

export async function upsertServiceType(input: {
  id?: string
  clinic_id: string
  name: string
  duration_minutes: number
  color?: string
  price_cents?: number | null
  is_active?: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("service_types").upsert(input)
  if (error) throw error
}
