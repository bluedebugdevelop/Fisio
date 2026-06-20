import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { requireSession } from "./session"

export const ACTIVE_CLINIC_COOKIE = "active_clinic_id"

export async function getMemberships() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinic_members")
    .select("clinic_id, role, clinics(id, name, timezone)")
    .eq("is_active", true)
  if (error) throw error
  return data ?? []
}

export async function getActiveClinic() {
  const user = await requireSession()
  const memberships = await getMemberships()
  if (memberships.length === 0) return { user, memberships, active: null }

  const jar = await cookies()
  const fromCookie = jar.get(ACTIVE_CLINIC_COOKIE)?.value
  const found = memberships.find((m) => m.clinic_id === fromCookie) ?? memberships[0]
  return { user, memberships, active: found }
}

export async function requireActiveClinic() {
  const ctx = await getActiveClinic()
  if (!ctx.active) redirect("/onboarding/clinica")
  return ctx as typeof ctx & { active: NonNullable<typeof ctx.active> }
}
