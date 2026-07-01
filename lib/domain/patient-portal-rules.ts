export type PortalAppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "no_show"
  | "cancelled"

type AppointmentActionInput = {
  starts_at: string
  status: PortalAppointmentStatus
}

type Range = {
  starts_at: string
  ends_at: string
}

export function canPatientConfirmAppointment(
  appointment: AppointmentActionInput,
  now = new Date(),
): boolean {
  return appointment.status === "scheduled" && new Date(appointment.starts_at).getTime() >= now.getTime()
}

export function canPatientCancelAppointment(
  appointment: AppointmentActionInput,
  now = new Date(),
): boolean {
  return (
    (appointment.status === "scheduled" || appointment.status === "confirmed")
    && new Date(appointment.starts_at).getTime() >= now.getTime()
  )
}

export function generateAvailableSlots(input: {
  day: string
  durationMinutes: number
  existing: Range[]
  now?: Date
  workdayStartHour?: number
  workdayEndHour?: number
  stepMinutes?: number
}): Range[] {
  const now = input.now ?? new Date()
  const stepMinutes = input.stepMinutes ?? 30
  const workdayStartHour = input.workdayStartHour ?? 9
  const workdayEndHour = input.workdayEndHour ?? 20
  const dayStart = new Date(`${input.day}T00:00:00.000Z`)
  const firstStart = addMinutes(dayStart, workdayStartHour * 60)
  const lastEnd = addMinutes(dayStart, workdayEndHour * 60)
  const slots: Range[] = []

  for (
    let startsAt = firstStart;
    addMinutes(startsAt, input.durationMinutes).getTime() <= lastEnd.getTime();
    startsAt = addMinutes(startsAt, stepMinutes)
  ) {
    const endsAt = addMinutes(startsAt, input.durationMinutes)
    if (startsAt.getTime() < now.getTime()) continue
    const candidate = { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() }
    if (input.existing.some((range) => rangesOverlap(candidate, range))) continue
    slots.push(candidate)
  }

  return slots
}

export function isRequestedSlotAvailable(input: {
  startsAt: string
  slots: Range[]
}): boolean {
  const requestedStart = new Date(input.startsAt).getTime()
  return input.slots.some((slot) => new Date(slot.starts_at).getTime() === requestedStart)
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function rangesOverlap(a: Range, b: Range): boolean {
  return new Date(a.starts_at).getTime() < new Date(b.ends_at).getTime()
    && new Date(b.starts_at).getTime() < new Date(a.ends_at).getTime()
}
