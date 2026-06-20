"use client"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"
import { ServiceTypeDialog } from "./ServiceTypeDialog"

type Row = {
  id: string; name: string; duration_minutes: number; color: string
  price_cents: number | null; is_active: boolean
}

export function ServiceTypesTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin tipos de servicio", description: "Añade tu primer tipo de servicio." }}
      columns={[
        { key: "color", header: "", className: "w-6", render: (r) => <span className="inline-block size-3 rounded-full" style={{ background: r.color }} /> },
        { key: "name", header: "Nombre", render: (r) => r.name },
        { key: "duration", header: "Duración (min)", render: (r) => r.duration_minutes },
        { key: "price", header: "Precio", render: (r) => r.price_cents ? (r.price_cents / 100).toFixed(2) + " €" : "—" },
        { key: "status", header: "Estado", render: (r) => r.is_active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge> },
        { key: "actions", header: "", className: "w-24 text-right", render: (r) => <ServiceTypeDialog initial={r} /> },
      ]}
    />
  )
}
