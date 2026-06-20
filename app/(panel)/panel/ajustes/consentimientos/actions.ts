"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const schema = z.object({
  kind: z.enum(["tratamiento", "comunicaciones", "imagen", "menores"]),
  title: z.string().min(1),
  body_markdown: z.string().min(1),
})

export type ConsentState = { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean } | null

export async function publishConsentAction(_prev: ConsentState, formData: FormData): Promise<ConsentState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  // Calcula próxima versión
  const { data: last } = await supabase
    .from("clinic_consents")
    .select("version")
    .eq("clinic_id", active.clinic_id)
    .eq("kind", parsed.data.kind)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = (last?.version ?? 0) + 1
  // Marca anteriores como no actuales
  await supabase
    .from("clinic_consents")
    .update({ is_current: false })
    .eq("clinic_id", active.clinic_id)
    .eq("kind", parsed.data.kind)
  const { error } = await supabase.from("clinic_consents").insert({
    clinic_id: active.clinic_id,
    kind: parsed.data.kind,
    version: nextVersion,
    title: parsed.data.title,
    body_markdown: parsed.data.body_markdown,
    is_current: true,
  })
  if (error) return { error: error.message }
  revalidatePath("/panel/ajustes/consentimientos")
  return { ok: true }
}
