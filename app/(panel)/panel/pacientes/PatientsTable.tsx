import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"
import type { PatientListRow } from "@/lib/db/patients"

export function PatientsTable({ rows }: { rows: PatientListRow[] }) {
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin pacientes", description: "Da de alta al primer paciente." }}
      columns={[
        { key: "name", header: "Paciente",
          render: (r) => (
            <Link href={`/panel/pacientes/${r.id}`} className="font-medium hover:underline">
              {r.last_name}, {r.first_name}
            </Link>
          ) },
        { key: "dni", header: "DNI", render: (r) => r.dni ?? "—" },
        { key: "phone", header: "Teléfono", render: (r) => r.phone ?? "—" },
        { key: "email", header: "Email", render: (r) => r.email ?? "—" },
        { key: "status", header: "",
          render: (r) => r.is_active ? null : <Badge variant="outline">Inactivo</Badge> },
      ]}
    />
  )
}
