export type AppointmentStatus =
  | "scheduled" | "confirmed" | "checked_in" | "completed" | "no_show" | "cancelled"

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
