"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { updateClinicalRecord } from "@/lib/db/clinical-records"

const schema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  chief_complaint: z.string().optional().or(z.literal("")),
  diagnosis: z.string().optional().or(z.literal("")),
  medical_history: z.string().optional().or(z.literal("")),
  current_medication: z.string().optional().or(z.literal("")),
  allergies: z.string().optional().or(z.literal("")),
  red_flags: z.string().optional().or(z.literal("")),
  objectives: z.string().optional().or(z.literal("")),
})

export type RecordState = { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean } | null

export async function saveClinicalRecordAction(_prev: RecordState, formData: FormData): Promise<RecordState> {
  const { user, active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const data = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]))
  try {
    await updateClinicalRecord(parsed.data.id, {
      chief_complaint: data.chief_complaint as string | null,
      diagnosis: data.diagnosis as string | null,
      medical_history: data.medical_history as string | null,
      current_medication: data.current_medication as string | null,
      allergies: data.allergies as string | null,
      red_flags: data.red_flags as string | null,
      objectives: data.objectives as string | null,
      updated_by: user.id,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath(`/panel/pacientes/${parsed.data.patient_id}/historia`)
  return { ok: true }
}
