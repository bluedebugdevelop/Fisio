"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const schema = z.object({
  name: z.string().min(2),
  legal_name: z.string().optional().or(z.literal("")),
  cif: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  timezone: z.string(),
  dpo_contact: z.string().optional().or(z.literal("")),
})

export type ClinicFormState = { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean } | null

export async function updateClinicAction(_prev: ClinicFormState, formData: FormData): Promise<ClinicFormState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const payload: Record<string, string | null> = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v])
  )
  const { error } = await supabase
    .from("clinics")
    .update(payload as never)
    .eq("id", active.clinic_id)
  if (error) return { error: error.message }
  revalidatePath("/panel", "layout")
  return { ok: true }
}
