import "server-only"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function getSession() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function requireSession() {
  const user = await getSession()
  if (!user) redirect("/login")
  return user
}
