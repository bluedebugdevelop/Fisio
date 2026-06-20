import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listProfessionals } from "@/lib/db/professionals"
import { listMembers } from "@/lib/db/members"
import { ProfessionalsTable } from "./ProfessionalsTable"
import { ProfessionalDialog } from "./ProfessionalDialog"

export default async function FisiosPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const [professionals, members] = await Promise.all([
    listProfessionals(active.clinic_id),
    listMembers(active.clinic_id),
  ])
  const candidates = members.filter((m) => m.role === "physio" || m.role === "admin")
  return (
    <>
      <PageHeader
        title="Fisioterapeutas"
        description="Profesionales que aparecen en la agenda."
        actions={<ProfessionalDialog candidates={candidates} />}
      />
      <div className="p-6">
        <ProfessionalsTable rows={professionals} candidates={candidates} />
      </div>
    </>
  )
}
