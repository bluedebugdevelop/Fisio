import "server-only"
import { headers } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

export type AuditAction = Database["public"]["Enums"]["audit_action"]

export async function writeAudit(input: {
  action: AuditAction
  entityType: string
  entityId?: string
  entityOwnerId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createSupabaseServerClient()
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const ua = h.get("user-agent") ?? null
  const metadata = { ...input.metadata, ip, user_agent: ua }
  await supabase.rpc("write_audit_log", {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_entity_owner_id: input.entityOwnerId ?? null,
    p_metadata: metadata,
  })
}
