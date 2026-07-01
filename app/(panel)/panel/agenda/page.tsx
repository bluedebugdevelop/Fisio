import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { listAppointmentsInRange } from "@/lib/db/appointments"
import { listProfessionals } from "@/lib/db/professionals"
import { listRooms } from "@/lib/db/rooms"
import { listServiceTypes } from "@/lib/db/service-types"
import { getCalendarLoadRange } from "@/lib/domain/appointment-rules"
import { CalendarView } from "./CalendarView"

export default async function AgendaPage({
  searchParams,
}: { searchParams: Promise<{ date?: string; professional?: string; view?: string; resource?: string }> }) {
  const { active } = await requireActiveClinic()
  const sp = await searchParams
  const focus = sp.date ? new Date(sp.date) : new Date()
  const { from, to } = getCalendarLoadRange(focus, sp.view)

  const ids = sp.professional?.split(",").filter(Boolean) ?? []

  const [appointments, professionals, rooms, serviceTypes] = await Promise.all([
    listAppointmentsInRange(active.clinic_id, from.toISOString(), to.toISOString(), {
      professionalIds: ids.length ? ids : undefined,
    }),
    listProfessionals(active.clinic_id),
    listRooms(active.clinic_id),
    listServiceTypes(active.clinic_id),
  ])

  return (
    <>
      <PageHeader title="Agenda" description="Calendario de la clínica." />
      <CalendarView
        clinicId={active.clinic_id}
        initialDate={focus.toISOString()}
        appointments={appointments}
        professionals={professionals}
        rooms={rooms}
        serviceTypes={serviceTypes}
        selectedProfessionalIds={ids}
        initialView={sp.view}
        initialResourceMode={sp.resource}
      />
    </>
  )
}
