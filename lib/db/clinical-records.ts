import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { writeAudit } from "@/lib/audit/log"
import type { Database } from "@/lib/supabase/types"

type Upsert = Database["public"]["Tables"]["clinical_records"]["Insert"]

export async function getOrInitClinicalRecord(patientId: string, clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinical_records")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle()
  if (error) throw error
  if (data) {
    await writeAudit({
      action: "view",
      entityType: "clinical_records",
      entityId: data.id,
      entityOwnerId: patientId,
    })
    return data
  }
  const { data: created, error: e2 } = await supabase
    .from("clinical_records")
    .insert({ patient_id: patientId, clinic_id: clinicId })
    .select("*")
    .single()
  if (e2) throw e2
  await writeAudit({
    action: "view",
    entityType: "clinical_records",
    entityId: created.id,
    entityOwnerId: patientId,
  })
  return created
}

export async function updateClinicalRecord(id: string, input: Partial<Upsert> & { updated_by: string }) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("clinical_records").update(input).eq("id", id)
  if (error) throw error
  await writeAudit({
    action: "update",
    entityType: "clinical_records",
    entityId: id,
  })
}
