import Link from "next/link"
import { PageHeader } from "@/components/panel/PageHeader"
import { Button } from "@/components/ui/button"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { listPatients } from "@/lib/db/patients"
import { PatientsSearch } from "./PatientsSearch"
import { PatientsTable } from "./PatientsTable"

const PAGE = 25

export default async function PatientsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { active } = await requireActiveClinic()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? "1"))
  const { rows, total } = await listPatients(active.clinic_id, {
    search: sp.q,
    limit: PAGE,
    offset: (page - 1) * PAGE,
  })
  return (
    <>
      <PageHeader
        title="Pacientes"
        description={`${total} pacientes activos`}
        actions={
          <Button asChild size="sm">
            <Link href="/panel/pacientes/nuevo">Nuevo paciente</Link>
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <PatientsSearch initial={sp.q ?? ""} />
        <PatientsTable rows={rows} />
        {total > PAGE && <Pagination total={total} page={page} q={sp.q} />}
      </div>
    </>
  )
}

function Pagination({ total, page, q }: { total: number; page: number; q?: string }) {
  const pages = Math.ceil(total / PAGE)
  const make = (p: number) => `/panel/pacientes?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Página {page} de {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={make(page - 1)} className="underline">Anterior</Link>}
        {page < pages && <Link href={make(page + 1)} className="underline">Siguiente</Link>}
      </div>
    </div>
  )
}
