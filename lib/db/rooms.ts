import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function listRooms(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, kind, capacity, color, is_active")
    .eq("clinic_id", clinicId)
    .order("name")
  if (error) throw error
  return data ?? []
}

export async function upsertRoom(input: {
  id?: string
  clinic_id: string
  name: string
  kind: "consulta" | "box" | "gimnasio" | "otro"
  capacity?: number
  color?: string
  is_active?: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("rooms").upsert(input)
  if (error) throw error
}
