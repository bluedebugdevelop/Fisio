"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { getAppointment } from "@/lib/db/appointments"
import { getOrInitClinicalRecord } from "@/lib/db/clinical-records"
import { upsertSessionNote } from "@/lib/db/session-notes"
import { hasGrantedTreatmentConsent } from "@/lib/db/consents"
import { canWriteSessionNote } from "@/lib/domain/session-rules"

const schema = z.object({
  appointment_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  id: z.string().uuid().optional().or(z.literal("")),
  subjective: z.string().optional().or(z.literal("")),
  objective: z.string().optional().or(z.literal("")),
  assessment: z.string().optional().or(z.literal("")),
  plan: z.string().optional().or(z.literal("")),
  techniques: z.string().optional().or(z.literal("")),
  home_program: z.string().optional().or(z.literal("")),
  pain_pre: z.coerce.number().int().min(0).max(10).optional(),
  pain_post: z.coerce.number().int().min(0).max(10).optional(),
})

export type SessionNoteState = { error?: string; ok?: boolean } | null

export async function saveSessionNoteAction(_prev: SessionNoteState, formData: FormData): Promise<SessionNoteState> {
  const { user, active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Datos no válidos" }
  const app = await getAppointment(parsed.data.appointment_id)
  const consent = await hasGrantedTreatmentConsent(parsed.data.patient_id)
  if (!canWriteSessionNote(app.status, consent)) {
    return { error: "No se puede registrar la nota: estado de cita o consentimiento incompatibles." }
  }
  const record = await getOrInitClinicalRecord(parsed.data.patient_id, active.clinic_id)
  try {
    await upsertSessionNote({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      appointment_id: parsed.data.appointment_id,
      clinical_record_id: record.id,
      subjective: parsed.data.subjective || null,
      objective: parsed.data.objective || null,
      assessment: parsed.data.assessment || null,
      plan: parsed.data.plan || null,
      techniques: parsed.data.techniques
        ? parsed.data.techniques.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      home_program: parsed.data.home_program || null,
      pain_pre: parsed.data.pain_pre ?? null,
      pain_post: parsed.data.pain_post ?? null,
      author_id: user.id,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath(`/panel/pacientes/${parsed.data.patient_id}/sesiones`)
  return { ok: true }
}
