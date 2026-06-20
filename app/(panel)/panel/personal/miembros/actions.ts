"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { createInvitation, setMemberActive } from "@/lib/db/members"

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "physio", "reception"]),
})

export type InviteState = { error?: string; fieldErrors?: Record<string, string[]>; token?: string } | null

export async function createInvitationAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { user, active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    const token = await createInvitation({
      clinic_id: active.clinic_id,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: user.id,
    })
    revalidatePath("/panel/personal/miembros")
    return { token }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
}

export async function toggleMemberActiveAction(id: string, active: boolean) {
  await setMemberActive(id, active)
  revalidatePath("/panel/personal/miembros")
}
