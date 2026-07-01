import Link from "next/link"
import type { ReactNode } from "react"
import { CalendarDays, FileText, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPortalContext, listPortalAppointments, listPortalDocuments } from "@/lib/db/patient-portal"
import { PortalEmpty } from "./PortalEmpty"

export default async function PortalHomePage() {
  const context = await getPortalContext()
  if (!context) return <PortalEmpty />

  const [appointments, documents] = await Promise.all([
    listPortalAppointments(context),
    listPortalDocuments(context),
  ])
  const now = Date.now()
  const upcoming = appointments.filter((a) => new Date(a.starts_at).getTime() >= now && a.status !== "cancelled")

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hola, {context.patient.first_name}</h1>
          <p className="text-sm text-muted-foreground">{context.clinic.name}</p>
        </div>
        <Button asChild>
          <Link href="/portal/citas/nueva">Solicitar cita</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={<CalendarDays className="size-5" />} title="Próximas citas" value={upcoming.length} href="/portal/citas" />
        <SummaryCard icon={<FileText className="size-5" />} title="Documentos" value={documents.length} href="/portal/documentos" />
        <SummaryCard icon={<UserRound className="size-5" />} title="Datos de contacto" value={context.patient.phone ? "Completos" : "Pendientes"} href="/portal/perfil" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próxima cita</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming[0] ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{new Date(upcoming[0].starts_at).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}</p>
                <p className="text-sm text-muted-foreground">
                  {upcoming[0].service_types?.name ?? "Cita"} con {upcoming[0].professionals?.display_name ?? "tu fisio"}
                </p>
              </div>
              <Badge variant="outline">{statusLabel(upcoming[0].status)}</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tienes citas próximas.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon,
  title,
  value,
  href,
}: {
  icon: ReactNode
  title: string
  value: string | number
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition hover:bg-muted">
        <CardContent className="flex items-center justify-between pt-0">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
          <span className="text-muted-foreground">{icon}</span>
        </CardContent>
      </Card>
    </Link>
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
