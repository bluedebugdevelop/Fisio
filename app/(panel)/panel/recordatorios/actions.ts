"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { upsertTemplate } from "@/lib/db/reminders"

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(1),
  channel: z.enum(["email", "inapp"]),
  subject_template: z.string().optional().or(z.literal("")),
  body_template: z.string().min(1),
  is_active: z.coerce.boolean().optional(),
})

export type TemplateState =
  | { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean }
  | null

export async function saveTemplateAction(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    await upsertTemplate({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      name: parsed.data.name,
      channel: parsed.data.channel,
      subject_template: parsed.data.subject_template || null,
      body_template: parsed.data.body_template,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath("/panel/recordatorios")
  return { ok: true }
}
