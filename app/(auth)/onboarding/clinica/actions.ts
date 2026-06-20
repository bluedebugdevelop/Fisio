"use server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ACTIVE_CLINIC_COOKIE } from "@/lib/auth/clinic-context"

const schema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  legal_name: z.string().optional().or(z.literal("")),
  cif: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  timezone: z.string().default("Europe/Madrid"),
})

export type OnboardingState = { error?: string; fieldErrors?: Record<string, string[]> } | null

export async function bootstrapClinicAction(
  _prev: OnboardingState, formData: FormData
): Promise<OnboardingState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const supabase = await createSupabaseServerClient()
  const args = parsed.data
  const { data, error } = await supabase.rpc("bootstrap_clinic", {
    p_name: args.name,
    p_legal_name: args.legal_name || null,
    p_cif: args.cif || null,
    p_address: args.address || null,
    p_city: args.city || null,
    p_postal_code: args.postal_code || null,
    p_phone: args.phone || null,
    p_email: args.email || null,
    p_timezone: args.timezone,
  })
  if (error || !data) return { error: error?.message ?? "No se pudo crear la clínica" }

  const jar = await cookies()
  jar.set(ACTIVE_CLINIC_COOKIE, data, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  })
  redirect("/panel")
}
