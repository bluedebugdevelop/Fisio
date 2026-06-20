import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { writeAudit } from "@/lib/audit/log"
import type { Database } from "@/lib/supabase/types"

export type PatientListRow = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  dni: string | null
  birth_date: string | null
  is_active: boolean
}

export async function listPatients(
  clinicId: string,
  opts: { search?: string; limit?: number; offset?: number } = {},
): Promise<{ rows: PatientListRow[]; total: number }> {
  const supabase = await createSupabaseServerClient()
  const limit = opts.limit ?? 25
  const offset = opts.offset ?? 0
  let q = supabase
    .from("patients")
    .select("id, first_name, last_name, email, phone, dni, birth_date, is_active", { count: "exact" })
    .eq("clinic_id", clinicId)
    .is("deleted_at", null)
    .order("last_name")
    .order("first_name")
    .range(offset, offset + limit - 1)

  if (opts.search && opts.search.trim()) {
    const term = opts.search.trim()
    q = q.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,dni.ilike.%${term}%`,
    )
  }
  const { data, count, error } = await q
  if (error) throw error
  return { rows: (data ?? []) as PatientListRow[], total: count ?? 0 }
}

export type PatientInsert = Omit<
  Database["public"]["Tables"]["patients"]["Insert"],
  "clinic_id" | "id" | "created_at" | "updated_at" | "deleted_at"
>

export async function getPatient(clinicId: string, patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("id", patientId)
    .is("deleted_at", null)
    .single()
  if (error) throw error
  await writeAudit({
    action: "view",
    entityType: "patients",
    entityId: patientId,
    entityOwnerId: patientId,
  })
  return data
}

export async function createPatient(clinicId: string, input: PatientInsert) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...input, clinic_id: clinicId })
    .select("id")
    .single()
  if (error) throw error
  return data.id
}

export async function updatePatient(clinicId: string, patientId: string, input: PatientInsert) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("patients")
    .update(input)
    .eq("clinic_id", clinicId)
    .eq("id", patientId)
  if (error) throw error
}

export async function anonymizePatient(patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc("anonymize_patient", { p_patient_id: patientId })
  if (error) throw error
}
