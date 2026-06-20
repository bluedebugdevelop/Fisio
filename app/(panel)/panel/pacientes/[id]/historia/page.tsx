import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { getOrInitClinicalRecord } from "@/lib/db/clinical-records"
import { ClinicalRecordForm } from "./ClinicalRecordForm"

export default async function HistoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const record = await getOrInitClinicalRecord(id, active.clinic_id)
  return (
    <>
      <PageHeader title="Historia clínica" description="Información clínica permanente del paciente." />
      <div className="p-6 max-w-3xl"><ClinicalRecordForm initial={record} patientId={id} /></div>
    </>
  )
}
