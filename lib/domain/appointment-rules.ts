export type AppointmentStatus =
  | "scheduled" | "confirmed" | "checked_in" | "completed" | "no_show" | "cancelled"

export type CalendarViewName =
  | "timeGridDay"
  | "timeGridWeek"
  | "dayGridMonth"
  | "resourceTimeGridDay"
  | "resourceTimeGridWeek"

export type AppointmentDuplicateSource = {
  patient_id: string
  professional_id: string
  room_id: string | null
  service_type_id: string | null
  starts_at: string
  ends_at: string
  notes_for_reception: string | null
  patients?: { id: string; first_name: string; last_name: string } | null
  professionals?: { id: string; display_name: string; color: string } | null
  rooms?: { id: string; name: string } | null
  service_types?: { id: string; name: string; color: string } | null
}

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["completed", "cancelled"],
  completed: [],
  no_show: [],
  cancelled: [],
}

export function canTransitionStatus(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (from === to) return true
  return TRANSITIONS[from].includes(to)
}

export function validateAppointmentTimes(startsAt: Date, endsAt: Date): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("ends_at debe ser posterior a starts_at")
  }
  const minutes = (endsAt.getTime() - startsAt.getTime()) / 60000
  if (minutes < 5) throw new Error("La duración mínima es 5 minutos")
  if (minutes > 480) throw new Error("La duración máxima es 8 horas")
}

type Range = { starts_at: string; ends_at: string }

export function hasOverlap(a: Range, b: Range): boolean {
  const aStart = new Date(a.starts_at).getTime()
  const aEnd = new Date(a.ends_at).getTime()
  const bStart = new Date(b.starts_at).getTime()
  const bEnd = new Date(b.ends_at).getTime()
  return aStart < bEnd && bStart < aEnd
}

export function buildDuplicatedAppointmentDraft(
  appointment: AppointmentDuplicateSource,
  daysToShift = 7,
): AppointmentDuplicateSource {
  const shiftMs = daysToShift * 24 * 60 * 60 * 1000
  return {
    patient_id: appointment.patient_id,
    professional_id: appointment.professional_id,
    room_id: appointment.room_id,
    service_type_id: appointment.service_type_id,
    starts_at: new Date(new Date(appointment.starts_at).getTime() + shiftMs).toISOString(),
    ends_at: new Date(new Date(appointment.ends_at).getTime() + shiftMs).toISOString(),
    notes_for_reception: appointment.notes_for_reception,
    patients: appointment.patients,
    professionals: appointment.professionals,
    rooms: appointment.rooms,
    service_types: appointment.service_types,
  }
}

export function getCalendarLoadRange(
  focus: Date,
  view: string | undefined,
): { from: Date; to: Date } {
  if (view === "timeGridDay" || view === "resourceTimeGridDay") {
    const from = startOfLocalDay(focus)
    return { from, to: addLocalDays(from, 1) }
  }

  if (view === "dayGridMonth") {
    const firstOfMonth = new Date(focus.getFullYear(), focus.getMonth(), 1)
    const lastOfMonth = new Date(focus.getFullYear(), focus.getMonth() + 1, 0)
    const from = startOfWeekMonday(firstOfMonth)
    return { from, to: addLocalDays(startOfWeekMonday(lastOfMonth), 7) }
  }

  const from = startOfWeekMonday(focus)
  return { from, to: addLocalDays(from, 7) }
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function startOfWeekMonday(date: Date): Date {
  const start = startOfLocalDay(date)
  const daysSinceMonday = (start.getDay() + 6) % 7
  return addLocalDays(start, -daysSinceMonday)
}
