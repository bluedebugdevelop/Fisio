import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function getDashboardStats(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const [todayApps, totalPatients, upcoming] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .not("status", "in", "(cancelled,no_show)"),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase
      .from("appointments")
      .select("id, starts_at, status, patients(first_name, last_name), professionals(display_name)")
      .eq("clinic_id", clinicId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
  ])
  return {
    todayCount: todayApps.count ?? 0,
    patientsCount: totalPatients.count ?? 0,
    upcoming: upcoming.data ?? [],
  }
}
