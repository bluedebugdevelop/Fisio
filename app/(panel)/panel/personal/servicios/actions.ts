"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { upsertServiceType } from "@/lib/db/service-types"

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(1),
  duration_minutes: z.coerce.number().int().min(5).max(480),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  price_euros: z.coerce.number().min(0).optional(),
})

export type ServiceTypeState = { error?: string; fieldErrors?: Record<string, string[]> } | null

export async function saveServiceTypeAction(_prev: ServiceTypeState, formData: FormData): Promise<ServiceTypeState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    await upsertServiceType({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      name: parsed.data.name,
      duration_minutes: parsed.data.duration_minutes,
      color: parsed.data.color,
      price_cents: parsed.data.price_euros != null ? Math.round(parsed.data.price_euros * 100) : null,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath("/panel/personal/servicios")
  return null
}
