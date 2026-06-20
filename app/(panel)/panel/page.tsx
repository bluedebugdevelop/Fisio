import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { getDashboardStats } from "@/lib/db/dashboard"

export default async function PanelHome() {
  const { active } = await requireActiveClinic()
  const stats = await getDashboardStats(active.clinic_id)

  return (
    <>
      <PageHeader
        title={`Hola, ${active.clinics?.name}`}
        description="Resumen de tu clínica para hoy."
      />
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Citas de hoy" value={stats.todayCount} />
        <StatCard label="Pacientes activos" value={stats.patientsCount} />
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Próximas citas</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.upcoming.length === 0 && (
              <p className="text-muted-foreground">Sin citas próximas.</p>
            )}
            {stats.upcoming.map((a) => (
              <div key={a.id} className="flex justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0">
                <span className="truncate">
                  {a.patients?.first_name} {a.patients?.last_name}
                </span>
                <span className="text-muted-foreground">
                  {new Date(a.starts_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}
