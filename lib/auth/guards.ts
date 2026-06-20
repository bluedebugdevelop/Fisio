import "server-only"
import { forbidden } from "next/navigation"
import type { Database } from "@/lib/supabase/types"

type Role = Database["public"]["Enums"]["member_role"]

export function ensureRole(role: Role | undefined, allowed: Role[]): asserts role is Role {
  if (!role || !allowed.includes(role)) forbidden()
}
