"use client"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"
import { RoomDialog } from "./RoomDialog"

type Row = { id: string; name: string; kind: string; capacity: number; color: string; is_active: boolean }

export function RoomsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin salas", description: "Añade tu primera sala." }}
      columns={[
        { key: "color", header: "", className: "w-6", render: (r) => <span className="inline-block size-3 rounded-full" style={{ background: r.color }} /> },
        { key: "name", header: "Nombre", render: (r) => r.name },
        { key: "kind", header: "Tipo", render: (r) => r.kind },
        { key: "capacity", header: "Capacidad", render: (r) => r.capacity },
        { key: "status", header: "Estado", render: (r) => r.is_active ? <Badge variant="secondary">Activa</Badge> : <Badge variant="outline">Inactiva</Badge> },
        { key: "actions", header: "", className: "w-24 text-right", render: (r) => <RoomDialog initial={r} /> },
      ]}
    />
  )
}
