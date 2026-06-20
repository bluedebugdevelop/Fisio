import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"

type Row = {
  id: string
  channel: string
  scheduled_at: string
  status: string
  sent_at: string | null
  error_message: string | null
  appointments: {
    starts_at: string
    patients: { first_name: string; last_name: string } | null
    professionals: { display_name: string } | null
  } | null
}

const statusColor: Record<string, "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  sent: "secondary",
  failed: "destructive",
  cancelled: "outline",
}

export function RemindersList({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin recordatorios en cola" }}
      columns={[
        {
          key: "when",
          header: "Programado",
          render: (r) => new Date(r.scheduled_at).toLocaleString("es-ES"),
        },
        {
          key: "appt",
          header: "Cita",
          render: (r) =>
            r.appointments
              ? `${new Date(r.appointments.starts_at).toLocaleString("es-ES")} · ${r.appointments.patients?.first_name ?? ""} ${r.appointments.patients?.last_name ?? ""}`
              : "—",
        },
        {
          key: "fisio",
          header: "Fisio",
          render: (r) => r.appointments?.professionals?.display_name ?? "—",
        },
        { key: "channel", header: "Canal", render: (r) => r.channel },
        {
          key: "status",
          header: "Estado",
          render: (r) => (
            <Badge variant={statusColor[r.status] ?? "outline"}>{r.status}</Badge>
          ),
        },
        {
          key: "error",
          header: "Error",
          render: (r) =>
            r.error_message ??
            (r.sent_at ? new Date(r.sent_at).toLocaleString("es-ES") : "—"),
        },
      ]}
    />
  )
}
