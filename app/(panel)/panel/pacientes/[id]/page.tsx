import { notFound } from "next/navigation"
import Link from "next/link"
import { ClipboardList, FileText, Stethoscope } from "lucide-react"
import type { ReactNode } from "react"
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { getPatient } from "@/lib/db/patients"
import { listCurrentConsents, listPatientConsents } from "@/lib/db/consents"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PatientForm } from "../PatientForm"
import { ConsentsCard } from "./ConsentsCard"
import { DangerZone } from "./DangerZone"
import { getPortalAccountForPatient } from "@/lib/db/patient-portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await requireActiveClinic()
  let patient
  try { patient = await getPatient(active.clinic_id, id) } catch { notFound() }
  if (!patient) notFound()

  const [currentConsents, patientConsents, portalAccount] = await Promise.all([
    listCurrentConsents(active.clinic_id),
    listPatientConsents(id),
    getPortalAccountForPatient(id),
  ])
  const canAccessClinical = active.role === "admin" || active.role === "physio"

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
            {canAccessClinical && <TabsTrigger value="clinico">Área clínica</TabsTrigger>}
          </TabsList>
          <TabsContent value="datos" className="space-y-6 pt-4">
            <PatientForm initial={patient} />
            <PortalAccessCard
              patientEmail={patient.email}
              active={!!portalAccount?.is_active}
              acceptedAt={portalAccount?.accepted_at ?? null}
            />
            {active.role === "admin" && <DangerZone patientId={patient.id} />}
          </TabsContent>
          <TabsContent value="consentimientos" className="pt-4">
            <ConsentsCard
              patientId={patient.id}
              currentConsents={currentConsents}
              patientConsents={patientConsents}
            />
          </TabsContent>
          {canAccessClinical && (
            <TabsContent value="clinico" className="pt-4">
              <div className="grid gap-3 md:grid-cols-3">
                <PatientAreaLink
                  href={`/panel/pacientes/${patient.id}/historia`}
                  icon={<Stethoscope className="size-5" />}
                  title="Historia clínica"
                  description="Motivo de consulta, diagnóstico, antecedentes y objetivos."
                />
                <PatientAreaLink
                  href={`/panel/pacientes/${patient.id}/sesiones`}
                  icon={<ClipboardList className="size-5" />}
                  title="Sesiones"
                  description="Notas SOAP vinculadas a cada cita realizada."
                />
                <PatientAreaLink
                  href={`/panel/pacientes/${patient.id}/documentos`}
                  icon={<FileText className="size-5" />}
                  title="Documentos"
                  description="Informes, pruebas de imagen y archivos del paciente."
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  )
}

function PortalAccessCard({
  patientEmail,
  active,
  acceptedAt,
}: {
  patientEmail: string | null
  active: boolean
  acceptedAt: string | null
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Portal del paciente</CardTitle>
        {active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Pendiente</Badge>}
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {patientEmail ? (
          <>
            <p>
              El paciente puede registrarse en el portal con <span className="font-medium text-foreground">{patientEmail}</span>.
              Al entrar, la cuenta se vinculará automáticamente si el email coincide.
            </p>
            {acceptedAt && <p>Vinculado el {new Date(acceptedAt).toLocaleString("es-ES")}.</p>}
            <p className="text-xs">Enlace para enviar: /signup?next=/portal</p>
          </>
        ) : (
          <p>Añade un email al paciente para que pueda activar el portal.</p>
        )}
      </CardContent>
    </Card>
  )
}

function PatientAreaLink({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-32 flex-col justify-between rounded-lg border bg-card p-4 transition hover:bg-muted"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <span className="text-muted-foreground group-hover:text-foreground">{icon}</span>
        {title}
      </span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </Link>
  )
}
