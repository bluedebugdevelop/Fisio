"use server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { headers } from "next/headers"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { createPatient, updatePatient, anonymizePatient } from "@/lib/db/patients"
import { grantConsent } from "@/lib/db/consents"

const patientSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  first_name: z.string().min(1, "Obligatorio"),
  last_name: z.string().min(1, "Obligatorio"),
  dni: z.string().optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.enum(["f", "m", "x", "none"]).optional(),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  notes_admin: z.string().optional().or(z.literal("")),
  referred_by: z.string().optional().or(z.literal("")),
})

export type PatientState = { error?: string; fieldErrors?: Record<string, string[]> } | null

function cleanInput(d: z.infer<typeof patientSchema>) {
  const e = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === "" ? null : v]))
  delete e.id
  // TODO: remove cast once db:types runs against real schema
  return e as never as Parameters<typeof createPatient>[1]
}

export async function createPatientAction(_prev: PatientState, formData: FormData): Promise<PatientState> {
  const { active } = await requireActiveClinic()
  const parsed = patientSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    const id = await createPatient(active.clinic_id, cleanInput(parsed.data))
    revalidatePath("/panel/pacientes")
    redirect(`/panel/pacientes/${id}`)
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate key")) {
      return { error: "Ya existe un paciente con ese DNI en la clínica." }
    }
    throw e
  }
}

export async function updatePatientAction(_prev: PatientState, formData: FormData): Promise<PatientState> {
  const { active } = await requireActiveClinic()
  const parsed = patientSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  if (!parsed.data.id) return { error: "Falta id" }
  try {
    await updatePatient(active.clinic_id, parsed.data.id, cleanInput(parsed.data))
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath(`/panel/pacientes/${parsed.data.id}`)
  return null
}

export async function grantConsentAction(formData: FormData) {
  const { active } = await requireActiveClinic()
  const patientId = String(formData.get("patient_id"))
  const consentId = String(formData.get("consent_id"))
  const granted = formData.get("granted") === "on"
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const ua = h.get("user-agent") ?? null
  await grantConsent({
    patient_id: patientId,
    clinic_id: active.clinic_id,
    consent_id: consentId,
    granted,
    granted_ip: ip,
    granted_user_agent: ua,
  })
  revalidatePath(`/panel/pacientes/${patientId}`)
}

export async function anonymizePatientAction(patientId: string) {
  await anonymizePatient(patientId)
  revalidatePath("/panel/pacientes")
  redirect("/panel/pacientes")
}
