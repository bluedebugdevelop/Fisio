import Link from "next/link"
import { PageHeader } from "@/components/panel/PageHeader"
import { Badge } from "@/components/ui/badge"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listSessionNotes } from "@/lib/db/session-notes"

export default async function SessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const notes = await listSessionNotes(id)
  return (
    <>
      <PageHeader title="Sesiones" description="Notas SOAP por cita." />
      <div className="p-6 space-y-3">
        {notes.length === 0 && <p className="text-sm text-muted-foreground">Sin notas de sesión.</p>}
        {notes.map((n) => (
          <Link key={n.id} href={`/panel/pacientes/${id}/sesiones/${n.appointment_id}`}
                className="block rounded-lg border bg-card p-4 hover:bg-muted">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {new Date(n.appointments?.starts_at ?? n.created_at).toLocaleString("es-ES")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {n.appointments?.professionals?.display_name ?? "Profesional"}
                </div>
              </div>
              {n.pain_pre != null && n.pain_post != null && (
                <Badge variant="outline">EVA {n.pain_pre} → {n.pain_post}</Badge>
              )}
            </div>
            {n.assessment && <p className="mt-2 line-clamp-2 text-sm">{n.assessment}</p>}
          </Link>
        ))}
      </div>
    </>
  )
}
