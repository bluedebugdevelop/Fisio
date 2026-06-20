import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listDocuments } from "@/lib/db/documents"
import { DocumentsList } from "./DocumentsList"
import { DocumentUploader } from "./DocumentUploader"

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const docs = await listDocuments(id)
  return (
    <>
      <PageHeader
        title="Documentos"
        description="Informes, pruebas y otros archivos."
        actions={<DocumentUploader patientId={id} clinicId={active.clinic_id} />}
      />
      <div className="p-6"><DocumentsList rows={docs} patientId={id} /></div>
    </>
  )
}
