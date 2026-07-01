"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getPortalContext, updatePortalProfile } from "@/lib/db/patient-portal"

const schema = z.object({
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Email no válido").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
})

export async function updatePortalProfileAction(formData: FormData) {
  const context = await getPortalContext()
  if (!context) redirect("/portal")
  const parsed = schema.parse(Object.fromEntries(formData))
  await updatePortalProfile(context, {
    phone: parsed.phone || null,
    email: parsed.email || null,
    address: parsed.address || null,
    city: parsed.city || null,
    postal_code: parsed.postal_code || null,
  })
  revalidatePath("/portal/perfil")
  revalidatePath("/portal")
}
