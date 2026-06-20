import "server-only"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import type { Database } from "./types"

/**
 * Service-role client. Saltea RLS. Usar SOLO en endpoints internos:
 * - Cron (/api/reminders/dispatch)
 * - Webhooks
 * - Migraciones server-side
 * Nunca en handlers expuestos al usuario.
 */
export function createSupabaseServiceClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
