import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listAuditLogs } from "@/lib/db/audit"
import { AuditTable } from "./AuditTable"

export default async function AuditPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const rows = await listAuditLogs(active.clinic_id)
  return (
    <>
      <PageHeader title="Registro de auditoría" description="Accesos y cambios a datos clínicos." />
      <div className="p-6"><AuditTable rows={rows} /></div>
    </>
  )
}
