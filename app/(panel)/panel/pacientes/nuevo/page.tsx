import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { PatientForm } from "../PatientForm"

export default async function NewPatientPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio", "reception"])
  return (
    <>
      <PageHeader title="Nuevo paciente" description="Datos básicos. Podrás añadir historia clínica después." />
      <div className="p-6"><PatientForm initial={null} /></div>
    </>
  )
}
