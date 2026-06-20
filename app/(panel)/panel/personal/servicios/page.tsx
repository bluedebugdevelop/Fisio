import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listServiceTypes } from "@/lib/db/service-types"
import { ServiceTypeDialog } from "./ServiceTypeDialog"
import { ServiceTypesTable } from "./ServiceTypesTable"

export default async function ServiceTypesPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const services = await listServiceTypes(active.clinic_id)
  return (
    <>
      <PageHeader
        title="Tipos de servicio"
        description="Sesiones, duraciones y precios."
        actions={<ServiceTypeDialog />}
      />
      <div className="p-6"><ServiceTypesTable rows={services} /></div>
    </>
  )
}
