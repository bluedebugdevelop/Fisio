import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/EmptyState"
import { getPortalContext, listPortalAppointments, type PortalAppointment } from "@/lib/db/patient-portal"
import { PortalEmpty } from "../PortalEmpty"
import { cancelPortalAppointmentAction, confirmPortalAppointmentAction } from "./actions"

export default async function PortalAppointmentsPage() {
  const context = await getPortalContext()
  if (!context) return <PortalEmpty />
  const appointments = await listPortalAppointments(context)
  const now = Date.now()
  const upcoming = appointments.filter((a) => new Date(a.starts_at).getTime() >= now)
  const past = appointments.filter((a) => new Date(a.starts_at).getTime() < now)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mis citas</h1>
          <p className="text-sm text-muted-foreground">Consulta, confirma o cancela tus citas.</p>
        </div>
        <Button asChild>
          <Link href="/portal/citas/nueva">Solicitar cita</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Próximas</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="Sin citas próximas" description="Solicita una nueva cita cuando lo necesites." />
        ) : (
          upcoming.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Historial</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no tienes citas anteriores.</p>
        ) : (
          past.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} readonly />)
        )}
      </section>
    </div>
  )
}

function AppointmentCard({ appointment, readonly = false }: { appointment: PortalAppointment; readonly?: boolean }) {
  const canConfirm = appointment.status === "scheduled" && !readonly
  const canCancel = (appointment.status === "scheduled" || appointment.status === "confirmed") && !readonly
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{new Date(appointment.starts_at).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {appointment.service_types?.name ?? "Cita"} con {appointment.professionals?.display_name ?? "tu fisio"}
            {appointment.rooms?.name ? ` · ${appointment.rooms.name}` : ""}
          </p>
        </div>
        <Badge variant={appointment.status === "cancelled" ? "destructive" : "outline"}>
          {statusLabel(appointment.status)}
        </Badge>
      </CardHeader>
      {(canConfirm || canCancel || appointment.cancel_reason) && (
        <CardContent className="space-y-3">
          {appointment.cancel_reason && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Motivo: {appointment.cancel_reason}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {canConfirm && (
              <form action={confirmPortalAppointmentAction}>
                <input type="hidden" name="appointment_id" value={appointment.id} />
                <Button type="submit" size="sm" variant="secondary">Confirmar</Button>
              </form>
            )}
            {canCancel && (
              <form action={cancelPortalAppointmentAction} className="flex flex-1 flex-col gap-2 sm:flex-row">
                <input type="hidden" name="appointment_id" value={appointment.id} />
                <input
                  name="reason"
                  className="h-8 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
                  placeholder="Motivo de cancelación"
                  required
                />
                <Button type="submit" size="sm" variant="destructive">Cancelar</Button>
              </form>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    checked_in: "Llegó",
    completed: "Realizada",
    no_show: "No presentada",
    cancelled: "Cancelada",
  }
  return labels[status] ?? status
}
