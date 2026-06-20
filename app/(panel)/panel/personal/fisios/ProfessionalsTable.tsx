"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/shared/DataTable"
import { ProfessionalDialog } from "./ProfessionalDialog"
import { toggleProfessionalActiveAction } from "./actions"
import { useTransition } from "react"

type Row = {
  id: string; display_name: string; license_number: string | null; specialty: string | null
  color: string; default_appointment_minutes: number; is_active: boolean; user_id: string
}

type Candidate = { user_id: string; email: string; name: string | null; role: string }

export function ProfessionalsTable({ rows, candidates }: { rows: Row[]; candidates: Candidate[] }) {
  const [pending, start] = useTransition()
  return (
    <DataTable
      rows={rows}
      empty={{
        title: "Aún no hay fisios",
        description: "Añade el primer fisio para que aparezca en la agenda.",
      }}
      columns={[
        { key: "color", header: "", className: "w-6",
          render: (r) => <span className="inline-block size-3 rounded-full" style={{ background: r.color }} /> },
        { key: "name", header: "Nombre", render: (r) => r.display_name },
        { key: "specialty", header: "Especialidad", render: (r) => r.specialty ?? "—" },
        { key: "license", header: "Colegiado", render: (r) => r.license_number ?? "—" },
        { key: "duration", header: "Min/cita", render: (r) => r.default_appointment_minutes },
        { key: "status", header: "Estado",
          render: (r) => r.is_active
            ? <Badge variant="secondary">Activo</Badge>
            : <Badge variant="outline">Inactivo</Badge> },
        { key: "actions", header: "", className: "w-40 text-right",
          render: (r) => (
            <div className="flex justify-end gap-2">
              <ProfessionalDialog candidates={candidates} initial={r} />
              <Button
                variant="ghost" size="sm" disabled={pending}
                onClick={() => start(() => toggleProfessionalActiveAction(r.id, !r.is_active))}
              >
                {r.is_active ? "Desactivar" : "Activar"}
              </Button>
            </div>
          ) },
      ]}
    />
  )
}
