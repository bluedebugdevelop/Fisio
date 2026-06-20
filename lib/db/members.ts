import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceClient } from "@/lib/supabase/service"
import crypto from "node:crypto"
import type { Database } from "@/lib/supabase/types"

type Role = Database["public"]["Enums"]["member_role"]

export async function listMembers(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: members, error } = await supabase
    .from("clinic_members")
    .select("id, role, is_active, user_id, created_at")
    .eq("clinic_id", clinicId)
  if (error) throw error

  if (!members || members.length === 0) return []

  const service = createSupabaseServiceClient()
  const result = await Promise.all(members.map(async (m) => {
    const { data: user } = await service.auth.admin.getUserById(m.user_id)
    return {
      ...m,
      email: user.user?.email ?? "(sin email)",
      name: (user.user?.user_metadata?.full_name as string | undefined) ?? null,
    }
  }))
  return result
}

export async function listInvitations(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinic_invitations")
    .select("id, email, role, expires_at, accepted_at, created_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createInvitation(input: { clinic_id: string; email: string; role: Role; invited_by: string }) {
  const supabase = await createSupabaseServerClient()
  const token = crypto.randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase.from("clinic_invitations").insert({
    clinic_id: input.clinic_id,
    email: input.email,
    role: input.role,
    invited_by: input.invited_by,
    token,
    expires_at: expiresAt,
  })
  if (error) throw error
  return token
}

export async function setMemberActive(id: string, active: boolean) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("clinic_members").update({ is_active: active }).eq("id", id)
  if (error) throw error
}
