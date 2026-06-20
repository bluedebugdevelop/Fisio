"use server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { ACTIVE_CLINIC_COOKIE } from "@/lib/auth/clinic-context"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function setActiveClinicAction(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .maybeSingle()
  if (!data) throw new Error("Clínica no autorizada")

  const jar = await cookies()
  jar.set(ACTIVE_CLINIC_COOKIE, clinicId, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  })
  revalidatePath("/panel", "layout")
}
