import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"
import type { Json } from "@/lib/supabase/types"

type Row = {
  id: number
  action: string
  entity_type: string
  entity_id: string | null
  entity_owner_id: string | null
  metadata: Json
  at: string
  actor_email: string
}

export function AuditTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows.map((r) => ({ ...r, id: String(r.id) }))}
      empty={{ title: "Sin entradas", description: "Aún no se ha registrado actividad clínica." }}
      columns={[
        {
          key: "at",
          header: "Cuándo",
          render: (r) => new Date(r.at).toLocaleString("es-ES"),
        },
        { key: "actor", header: "Usuario", render: (r) => r.actor_email },
        {
          key: "action",
          header: "Acción",
          render: (r) => <Badge variant="outline">{r.action}</Badge>,
        },
        {
          key: "entity",
          header: "Entidad",
          render: (r) => `${r.entity_type}${r.entity_id ? `#${r.entity_id.slice(0, 8)}` : ""}`,
        },
        {
          key: "ip",
          header: "IP",
          render: (r) => {
            const m = r.metadata as { ip?: string } | null
            return m?.ip ?? "—"
          },
        },
      ]}
    />
  )
}
