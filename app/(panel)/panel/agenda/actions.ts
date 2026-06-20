"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import {
  createAppointment, updateAppointment, transitionStatus,
} from "@/lib/db/appointments"
import { canTransitionStatus, validateAppointmentTimes } from "@/lib/domain/appointment-rules"
import type { AppointmentStatus } from "@/lib/db/appointments"

const baseSchema = z.object({
  patient_id: z.string().uuid(),
  professional_id: z.string().uuid(),
  room_id: z.string().uuid().optional().nullable().or(z.literal("")),
  service_type_id: z.string().uuid().optional().nullable().or(z.literal("")),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  notes_for_reception: z.string().optional().or(z.literal("")),
})

export type AppointmentState = { error?: string; fieldErrors?: Record<string, string[]>; id?: string } | null

export async function createAppointmentAction(_prev: AppointmentState, formData: FormData): Promise<AppointmentState> {
  const { user, active } = await requireActiveClinic()
  const parsed = baseSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    validateAppointmentTimes(new Date(parsed.data.starts_at), new Date(parsed.data.ends_at))
    const id = await createAppointment({
      clinic_id: active.clinic_id,
      patient_id: parsed.data.patient_id,
      professional_id: parsed.data.professional_id,
      room_id: parsed.data.room_id || null,
      service_type_id: parsed.data.service_type_id || null,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      notes_for_reception: parsed.data.notes_for_reception || null,
      created_by: user.id,
    })
    revalidatePath("/panel/agenda")
    return { id }
  } catch (e) {
    if (e instanceof Error && e.message.includes("exclusion constraint")) {
      return { error: "Solapamiento: ya hay una cita para ese fisio o sala en ese intervalo." }
    }
    return { error: e instanceof Error ? e.message : "Error al crear la cita" }
  }
}

const updateSchema = baseSchema.extend({ id: z.string().uuid() })

export async function updateAppointmentAction(_prev: AppointmentState, formData: FormData): Promise<AppointmentState> {
  await requireActiveClinic()
  const parsed = updateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    validateAppointmentTimes(new Date(parsed.data.starts_at), new Date(parsed.data.ends_at))
    await updateAppointment(parsed.data.id, {
      patient_id: parsed.data.patient_id,
      professional_id: parsed.data.professional_id,
      room_id: parsed.data.room_id || null,
      service_type_id: parsed.data.service_type_id || null,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      notes_for_reception: parsed.data.notes_for_reception || null,
    })
    revalidatePath("/panel/agenda")
    return { id: parsed.data.id }
  } catch (e) {
    if (e instanceof Error && e.message.includes("exclusion constraint")) {
      return { error: "Solapamiento con otra cita." }
    }
    return { error: e instanceof Error ? e.message : "Error al actualizar" }
  }
}

const moveSchema = z.object({
  id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  professional_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional().nullable(),
})

export async function moveAppointmentAction(input: z.infer<typeof moveSchema>) {
  await requireActiveClinic()
  const parsed = moveSchema.parse(input)
  validateAppointmentTimes(new Date(parsed.starts_at), new Date(parsed.ends_at))
  try {
    await updateAppointment(parsed.id, {
      starts_at: parsed.starts_at,
      ends_at: parsed.ends_at,
      ...(parsed.professional_id ? { professional_id: parsed.professional_id } : {}),
      ...(parsed.room_id !== undefined ? { room_id: parsed.room_id } : {}),
    })
    revalidatePath("/panel/agenda")
  } catch (e) {
    if (e instanceof Error && e.message.includes("exclusion constraint")) {
      throw new Error("Solapamiento")
    }
    throw e
  }
}

export async function changeStatusAction(input: {
  id: string
  from: AppointmentStatus
  to: AppointmentStatus
  reason?: string
}) {
  const { user } = await requireActiveClinic()
  if (!canTransitionStatus(input.from, input.to)) {
    throw new Error(`Transición no permitida: ${input.from} → ${input.to}`)
  }
  const extras: Record<string, unknown> = {}
  if (input.to === "cancelled") {
    if (!input.reason) throw new Error("Motivo de cancelación obligatorio")
    extras.cancel_reason = input.reason
    extras.cancelled_by = user.id
    extras.cancelled_at = new Date().toISOString()
  }
  await transitionStatus(input.id, input.to, extras)
  revalidatePath("/panel/agenda")
}
