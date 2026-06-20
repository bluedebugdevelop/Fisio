"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { setProfessionalActive, upsertProfessional } from "@/lib/db/professionals"

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  user_id: z.string().uuid("Selecciona un usuario"),
  display_name: z.string().min(2, "Nombre visible obligatorio"),
  license_number: z.string().optional().or(z.literal("")),
  specialty: z.string().optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color HEX requerido"),
  default_appointment_minutes: z.coerce.number().int().min(5).max(480),
})

export type ProfessionalState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | null

export async function saveProfessionalAction(_prev: ProfessionalState, formData: FormData): Promise<ProfessionalState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    await upsertProfessional({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      user_id: parsed.data.user_id,
      display_name: parsed.data.display_name,
      license_number: parsed.data.license_number || null,
      specialty: parsed.data.specialty || null,
      color: parsed.data.color,
      default_appointment_minutes: parsed.data.default_appointment_minutes,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error guardando fisio" }
  }
  revalidatePath("/panel/personal/fisios")
  return null
}

export async function toggleProfessionalActiveAction(id: string, active: boolean) {
  await setProfessionalActive(id, active)
  revalidatePath("/panel/personal/fisios")
}
