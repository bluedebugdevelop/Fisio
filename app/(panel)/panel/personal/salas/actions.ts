"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { upsertRoom } from "@/lib/db/rooms"

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(1, "Nombre obligatorio"),
  kind: z.enum(["consulta", "box", "gimnasio", "otro"]),
  capacity: z.coerce.number().int().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  is_active: z.coerce.boolean().optional(),
})

export type RoomState = { error?: string; fieldErrors?: Record<string, string[]> } | null

export async function saveRoomAction(_prev: RoomState, formData: FormData): Promise<RoomState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    await upsertRoom({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      capacity: parsed.data.capacity,
      color: parsed.data.color,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath("/panel/personal/salas")
  return null
}
