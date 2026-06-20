import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

type Insert = Database["public"]["Tables"]["appointments"]["Insert"]
type Update = Database["public"]["Tables"]["appointments"]["Update"]
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"]

export type AppointmentEvent = {
  id: string
  patient_id: string
  professional_id: string
  room_id: string | null
  service_type_id: string | null
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  notes_for_reception: string | null
  patients: { id: string; first_name: string; last_name: string } | null
  professionals: { id: string; display_name: string; color: string } | null
  rooms: { id: string; name: string } | null
  service_types: { id: string; name: string; color: string } | null
}

export async function listAppointmentsInRange(
  clinicId: string,
  from: string,
  to: string,
  opts: { professionalIds?: string[] } = {},
): Promise<AppointmentEvent[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase
    .from("appointments")
    .select(`
      id, patient_id, professional_id, room_id, service_type_id,
      starts_at, ends_at, status, notes_for_reception,
      patients(id, first_name, last_name),
      professionals(id, display_name, color),
      rooms(id, name),
      service_types(id, name, color)
    `)
    .eq("clinic_id", clinicId)
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at")
  if (opts.professionalIds?.length) q = q.in("professional_id", opts.professionalIds)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as AppointmentEvent[]
}

export async function getAppointment(id: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *, patients(id, first_name, last_name),
      professionals(id, display_name, color),
      rooms(id, name),
      service_types(id, name, color, duration_minutes)
    `)
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export async function createAppointment(input: Insert) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("appointments")
    .insert(input)
    .select("id")
    .single()
  if (error) throw error
  return data.id
}

export async function updateAppointment(id: string, input: Update) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("appointments").update(input).eq("id", id)
  if (error) throw error
}

export async function transitionStatus(id: string, status: AppointmentStatus, extras: Update = {}) {
  return updateAppointment(id, { status, ...extras })
}
