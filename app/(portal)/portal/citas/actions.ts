"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import {
  cancelPortalAppointment,
  confirmPortalAppointment,
  createPortalAppointment,
  getPortalContext,
} from "@/lib/db/patient-portal"

const appointmentIdSchema = z.object({ appointment_id: z.string().uuid() })
const cancelSchema = appointmentIdSchema.extend({
  reason: z.string().min(3, "Indica el motivo de cancelación"),
})
const createSchema = z.object({
  service_type_id: z.string().uuid(),
  professional_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
})

export async function confirmPortalAppointmentAction(formData: FormData) {
  const context = await getPortalContext()
  if (!context) redirect("/portal")
  const parsed = appointmentIdSchema.parse(Object.fromEntries(formData))
  await confirmPortalAppointment(context, parsed.appointment_id)
  revalidatePath("/portal/citas")
  revalidatePath("/portal")
}

export async function cancelPortalAppointmentAction(formData: FormData) {
  const context = await getPortalContext()
  if (!context) redirect("/portal")
  const parsed = cancelSchema.parse(Object.fromEntries(formData))
  await cancelPortalAppointment(context, parsed.appointment_id, parsed.reason)
  revalidatePath("/portal/citas")
  revalidatePath("/portal")
}

export async function createPortalAppointmentAction(formData: FormData) {
  const context = await getPortalContext()
  if (!context) redirect("/portal")
  const parsed = createSchema.parse(Object.fromEntries(formData))
  await createPortalAppointment(context, {
    serviceTypeId: parsed.service_type_id,
    professionalId: parsed.professional_id,
    startsAt: parsed.starts_at,
  })
  revalidatePath("/portal/citas")
  revalidatePath("/portal")
  redirect("/portal/citas")
}
