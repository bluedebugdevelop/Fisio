import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"

type Row = { id: string; email: string; role: string; expires_at: string; accepted_at: string | null }

export function InvitationsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin invitaciones", description: "No has invitado a nadie todavía." }}
      columns={[
        { key: "email", header: "Email", render: (r) => r.email },
        { key: "role", header: "Rol", render: (r) => <Badge variant="outline">{r.role}</Badge> },
        { key: "expires", header: "Caduca",
          render: (r) => new Date(r.expires_at).toLocaleDateString("es-ES") },
        { key: "status", header: "Estado",
          render: (r) => r.accepted_at
            ? <Badge variant="secondary">Aceptada</Badge>
            : <Badge variant="outline">Pendiente</Badge> },
      ]}
    />
  )
}
