import { notFound } from "next/navigation"
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { getPatient } from "@/lib/db/patients"
import { listCurrentConsents, listPatientConsents } from "@/lib/db/consents"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PatientForm } from "../PatientForm"
import { ConsentsCard } from "./ConsentsCard"
import { DangerZone } from "./DangerZone"

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await requireActiveClinic()
  let patient
  try { patient = await getPatient(active.clinic_id, id) } catch { notFound() }
  if (!patient) notFound()

  const [currentConsents, patientConsents] = await Promise.all([
    listCurrentConsents(active.clinic_id),
    listPatientConsents(id),
  ])

  return (
    <>
      <PageHeader
        title={`${patient.last_name}, ${patient.first_name}`}
        description={patient.dni ?? "Sin DNI"}
      />
      <div className="p-6">
        <Tabs defaultValue="datos">
          <TabsList>
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="consentimientos">Consentimientos</TabsTrigger>
            <TabsTrigger value="historia">Historia clínica</TabsTrigger>
            <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>
          <TabsContent value="datos" className="space-y-6 pt-4">
            <PatientForm initial={patient} />
            {active.role === "admin" && <DangerZone patientId={patient.id} />}
          </TabsContent>
          <TabsContent value="consentimientos" className="pt-4">
            <ConsentsCard
              patientId={patient.id}
              currentConsents={currentConsents}
              patientConsents={patientConsents}
            />
          </TabsContent>
          <TabsContent value="historia" className="pt-4">
            <PlaceholderTab href={`/panel/pacientes/${patient.id}/historia`} label="Ir a historia clínica" />
          </TabsContent>
          <TabsContent value="sesiones" className="pt-4">
            <PlaceholderTab href={`/panel/pacientes/${patient.id}/sesiones`} label="Ver sesiones" />
          </TabsContent>
          <TabsContent value="documentos" className="pt-4">
            <PlaceholderTab href={`/panel/pacientes/${patient.id}/documentos`} label="Ver documentos" />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function PlaceholderTab({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="inline-block rounded-md border border-dashed bg-card px-6 py-12 text-sm text-muted-foreground hover:bg-muted">
      {label}
    </a>
  )
}
