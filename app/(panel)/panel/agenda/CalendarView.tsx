"use client"
import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventResizeDoneArg } from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import type {
  EventInput, DateSelectArg, EventClickArg, EventDropArg,
} from "@fullcalendar/core"
import { AppointmentDialog } from "./AppointmentDialog"
import type { AppointmentEvent } from "@/lib/db/appointments"
import { moveAppointmentAction } from "./actions"

type Professional = { id: string; display_name: string; color: string; default_appointment_minutes: number; is_active: boolean }
type Room = { id: string; name: string; is_active: boolean }
type ServiceType = { id: string; name: string; color: string; duration_minutes: number; is_active: boolean }

export function CalendarView({
  clinicId, initialDate, appointments, professionals, rooms, serviceTypes,
}: {
  clinicId: string
  initialDate: string
  appointments: AppointmentEvent[]
  professionals: Professional[]
  rooms: Room[]
  serviceTypes: ServiceType[]
  selectedProfessionalIds?: string[]
}) {
  const ref = useRef<FullCalendar>(null)
  const router = useRouter()
  const sp = useSearchParams()
  const selected = (sp.get("professional") ?? "").split(",").filter(Boolean)
  const [dialogState, setDialogState] = useState<
    | { mode: "create"; initial: Partial<AppointmentEvent> }
    | { mode: "edit"; initial: AppointmentEvent }
    | null
  >(null)
  const [, start] = useTransition()

  function toggle(id: string) {
    const set = new Set(selected)
    if (set.has(id)) set.delete(id); else set.add(id)
    const next = new URLSearchParams(sp.toString())
    if (set.size === 0) next.delete("professional"); else next.set("professional", Array.from(set).join(","))
    router.replace(`/panel/agenda?${next.toString()}`)
  }

  const events: EventInput[] = useMemo(() => appointments.map((a) => ({
    id: a.id,
    title: `${a.patients?.first_name ?? ""} ${a.patients?.last_name ?? ""}`.trim() || "Paciente",
    start: a.starts_at,
    end: a.ends_at,
    backgroundColor: a.professionals?.color ?? "#1f6feb",
    borderColor: a.professionals?.color ?? "#1f6feb",
    extendedProps: { source: a },
    classNames: a.status === "cancelled" ? ["opacity-40", "line-through"] : [],
  })), [appointments])

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap gap-2 px-2">
        {professionals.filter((p) => p.is_active).map((p) => {
          const on = selected.length === 0 || selected.includes(p.id)
          return (
            <button
              key={p.id} type="button"
              onClick={() => toggle(p.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${on ? "" : "opacity-40"}`}
              style={{ borderColor: p.color }}
            >
              <span className="inline-block size-2 rounded-full" style={{ background: p.color }} />
              {p.display_name}
            </button>
          )
        })}
      </div>
      <FullCalendar
        ref={ref}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={initialDate}
        locale={esLocale}
        firstDay={1}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:15:00"
        nowIndicator
        editable
        selectable
        selectMirror
        height="calc(100vh - 180px)"
        events={events}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridDay,timeGridWeek,dayGridMonth",
        }}
        select={(s: DateSelectArg) => {
          const defaultProf = professionals.find((p) => p.is_active)
          setDialogState({
            mode: "create",
            initial: {
              starts_at: s.start.toISOString(),
              ends_at: s.end.toISOString(),
              professional_id: defaultProf?.id,
            },
          })
        }}
        eventClick={(arg: EventClickArg) => {
          const src = arg.event.extendedProps.source as AppointmentEvent
          setDialogState({ mode: "edit", initial: src })
        }}
        eventDrop={(arg: EventDropArg) => {
          start(async () => {
            try {
              await moveAppointmentAction({
                id: arg.event.id,
                starts_at: arg.event.start!.toISOString(),
                ends_at: arg.event.end!.toISOString(),
              })
            } catch (e) {
              arg.revert()
              alert(e instanceof Error ? e.message : "Error")
            }
          })
        }}
        eventResize={(arg: EventResizeDoneArg) => {
          start(async () => {
            try {
              await moveAppointmentAction({
                id: arg.event.id,
                starts_at: arg.event.start!.toISOString(),
                ends_at: arg.event.end!.toISOString(),
              })
            } catch (e) {
              arg.revert()
              alert(e instanceof Error ? e.message : "Error")
            }
          })
        }}
      />
      {dialogState && (
        <AppointmentDialog
          clinicId={clinicId}
          mode={dialogState.mode}
          initial={dialogState.initial}
          professionals={professionals}
          rooms={rooms}
          serviceTypes={serviceTypes}
          onClose={() => setDialogState(null)}
        />
      )}
    </div>
  )
}
