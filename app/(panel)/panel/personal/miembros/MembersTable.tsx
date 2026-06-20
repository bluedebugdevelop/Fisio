"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/shared/DataTable"
import { toggleMemberActiveAction } from "./actions"
import { useTransition } from "react"

type Row = { id: string; role: string; is_active: boolean; email: string; name: string | null; created_at: string }

export function MembersTable({ rows }: { rows: Row[] }) {
  const [pending, start] = useTransition()
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin miembros adicionales", description: "Aún eres el único miembro." }}
      columns={[
        { key: "name", header: "Nombre", render: (r) => r.name ?? "—" },
        { key: "email", header: "Email", render: (r) => r.email },
        { key: "role", header: "Rol", render: (r) => <Badge variant="outline">{r.role}</Badge> },
        { key: "status", header: "Estado",
          render: (r) => r.is_active
            ? <Badge variant="secondary">Activo</Badge>
            : <Badge variant="outline">Bloqueado</Badge> },
        { key: "actions", header: "", className: "w-32 text-right",
          render: (r) => (
            <Button
              variant="ghost" size="sm" disabled={pending}
              onClick={() => start(() => toggleMemberActiveAction(r.id, !r.is_active))}
            >
              {r.is_active ? "Bloquear" : "Reactivar"}
            </Button>
          ) },
      ]}
    />
  )
}
