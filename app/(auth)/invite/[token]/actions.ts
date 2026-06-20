"use server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ACTIVE_CLINIC_COOKIE } from "@/lib/auth/clinic-context"

export async function acceptInvitationAction(token: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token })
  if (error || !data) throw new Error(error?.message ?? "No se pudo aceptar")
  const jar = await cookies()
  jar.set(ACTIVE_CLINIC_COOKIE, data, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  })
  redirect("/panel")
}
