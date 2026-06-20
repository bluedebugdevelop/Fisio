export type AppointmentStatus =
  | "scheduled" | "confirmed" | "checked_in" | "completed" | "no_show" | "cancelled"

export function canWriteSessionNote(
  appointmentStatus: AppointmentStatus,
  hasTreatmentConsent: boolean,
): boolean {
  if (!hasTreatmentConsent) return false
  return appointmentStatus === "checked_in" || appointmentStatus === "completed"
}
