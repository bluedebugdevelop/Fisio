import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceClient } from "@/lib/supabase/service"

export async function listAuditLogs(clinicId: string, limit = 200) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, entity_owner_id, metadata, at, actor_user_id")
    .eq("clinic_id", clinicId)
    .order("at", { ascending: false })
    .limit(limit)
  if (error) throw error

  // Resolver emails de actores en lote
  const actorIds = Array.from(new Set((data ?? []).map((r) => r.actor_user_id).filter(Boolean) as string[]))
  const map = new Map<string, string>()
  if (actorIds.length > 0) {
    const service = createSupabaseServiceClient()
    for (const id of actorIds) {
      const { data: u } = await service.auth.admin.getUserById(id)
      if (u.user?.email) map.set(id, u.user.email)
    }
  }
  return (data ?? []).map((r) => ({
    ...r,
    actor_email: r.actor_user_id ? map.get(r.actor_user_id) ?? "(desconocido)" : "(sistema)",
  }))
}
