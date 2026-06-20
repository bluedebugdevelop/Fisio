import { notFound } from "next/navigation"
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { getAppointment } from "@/lib/db/appointments"
import { getSessionNoteByAppointment } from "@/lib/db/session-notes"
import { hasGrantedTreatmentConsent } from "@/lib/db/consents"
import { canWriteSessionNote } from "@/lib/domain/session-rules"
import { SessionNoteForm } from "./SessionNoteForm"

export default async function SessionNotePage({
  params,
}: { params: Promise<{ id: string; appointmentId: string }> }) {
  const { id, appointmentId } = await params
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])

  let app
  try { app = await getAppointment(appointmentId) } catch { notFound() }
  if (app.patient_id !== id || app.clinic_id !== active.clinic_id) notFound()

  const existing = await getSessionNoteByAppointment(appointmentId)
  const consent = await hasGrantedTreatmentConsent(id)
  const allowed = canWriteSessionNote(app.status, consent)

  const initial = existing
    ? {
        id: existing.id,
        subjective: existing.subjective,
        objective: existing.objective,
        assessment: existing.assessment,
        plan: existing.plan,
        techniques: Array.isArray(existing.techniques)
          ? (existing.techniques as unknown[]).filter((t): t is string => typeof t === "string")
          : [],
        home_program: existing.home_program,
        pain_pre: existing.pain_pre,
        pain_post: existing.pain_post,
      }
    : null

  return (
    <>
      <PageHeader
        title="Nota de sesión"
        description={`${new Date(app.starts_at).toLocaleString("es-ES")} con ${app.professionals?.display_name ?? ""}`}
      />
      <div className="p-6 max-w-3xl">
        {!allowed && (
          <div className="mb-4 rounded-md border-l-4 border-warning bg-warning/10 p-3 text-sm">
            No puedes editar esta nota: necesitas consentimiento de tratamiento y que la cita esté en estado "llegó" o "realizada".
          </div>
        )}
        <SessionNoteForm
          patientId={id}
          appointmentId={appointmentId}
          initial={initial}
          disabled={!allowed}
        />
      </div>
    </>
  )
}
