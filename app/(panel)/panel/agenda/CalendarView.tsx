"use client"
import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid"
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
type ResourceMode = "professional" | "room"

const NO_ROOM_RESOURCE_ID = "no-room"
const DEFAULT_VIEW = "resourceTimeGridDay"
const ALLOWED_VIEWS = new Set([
  "resourceTimeGridDay",
  "resourceTimeGridWeek",
  "timeGridDay",
  "timeGridWeek",
  "dayGridMonth",
])

export function CalendarView({
  clinicId, initialDate, appointments, professionals, rooms, serviceTypes,
  initialView, initialResourceMode,
}: {
  clinicId: string
  initialDate: string
  appointments: AppointmentEvent[]
  professionals: Professional[]
  rooms: Room[]
  serviceTypes: ServiceType[]
  selectedProfessionalIds?: string[]
  initialView?: string
  initialResourceMode?: string
}) {
  const ref = useRef<FullCalendar>(null)
  const router = useRouter()
  const sp = useSearchParams()
  const resourceMode = normalizeResourceMode(sp.get("resource") ?? initialResourceMode)
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

  function updateResourceMode(mode: ResourceMode) {
    const next = new URLSearchParams(sp.toString())
    next.set("resource", mode)
    router.replace(`/panel/agenda?${next.toString()}`)
  }

  function syncCalendarUrl(date: Date, viewType: string) {
    const next = new URLSearchParams(sp.toString())
    next.set("date", toDateParam(date))
    next.set("view", normalizeView(viewType))
    next.set("resource", resourceMode)
    const nextQs = next.toString()
    if (nextQs !== sp.toString()) router.replace(`/panel/agenda?${nextQs}`, { scroll: false })
  }

  const resources = useMemo(() => {
    if (resourceMode === "room") {
      return [
        { id: NO_ROOM_RESOURCE_ID, title: "Sin sala" },
        ...rooms.filter((r) => r.is_active).map((r) => ({ id: r.id, title: r.name })),
      ]
    }
    return professionals
      .filter((p) => p.is_active)
      .map((p) => ({ id: p.id, title: p.display_name, eventColor: p.color }))
  }, [professionals, resourceMode, rooms])

  const events: EventInput[] = useMemo(() => appointments.map((a) => ({
    id: a.id,
    title: `${a.patients?.first_name ?? ""} ${a.patients?.last_name ?? ""}`.trim() || "Paciente",
    start: a.starts_at,
    end: a.ends_at,
    resourceId: resourceMode === "room" ? (a.room_id ?? NO_ROOM_RESOURCE_ID) : a.professional_id,
    backgroundColor: a.professionals?.color ?? "#1f6feb",
    borderColor: a.professionals?.color ?? "#1f6feb",
    extendedProps: { source: a },
    classNames: a.status === "cancelled" ? ["opacity-40", "line-through"] : [],
  })), [appointments, resourceMode])

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex rounded-md border bg-background p-1 text-xs">
          <button
            type="button"
            onClick={() => updateResourceMode("professional")}
            className={`rounded px-3 py-1.5 ${resourceMode === "professional" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Cuadrante fisios
          </button>
          <button
            type="button"
            onClick={() => updateResourceMode("room")}
            className={`rounded px-3 py-1.5 ${resourceMode === "room" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Cuadrante salas
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
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
      </div>
      <FullCalendar
        ref={ref}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, resourceTimeGridPlugin]}
        initialView={normalizeView(sp.get("view") ?? initialView)}
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
        resources={resources}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "resourceTimeGridDay,resourceTimeGridWeek,timeGridDay,timeGridWeek,dayGridMonth",
        }}
        views={{
          resourceTimeGridDay: { buttonText: "Día recursos" },
          resourceTimeGridWeek: { buttonText: "Semana recursos" },
          timeGridDay: { buttonText: "Día" },
          timeGridWeek: { buttonText: "Semana" },
          dayGridMonth: { buttonText: "Mes" },
        }}
        datesSet={(arg) => syncCalendarUrl(arg.view.currentStart, arg.view.type)}
        select={(s: DateSelectArg) => {
          const selectedResourceId = getSelectedResourceId(s)
          const defaultProf = professionals.find((p) => p.is_active)
          setDialogState({
            mode: "create",
            initial: {
              starts_at: s.start.toISOString(),
              ends_at: s.end.toISOString(),
              professional_id: resourceMode === "professional"
                ? selectedResourceId ?? defaultProf?.id
                : defaultProf?.id,
              room_id: resourceMode === "room" ? normalizeRoomResourceId(selectedResourceId) : undefined,
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
              const newResourceId = getDropResourceId(arg)
              await moveAppointmentAction({
                id: arg.event.id,
                starts_at: arg.event.start!.toISOString(),
                ends_at: arg.event.end!.toISOString(),
                ...(newResourceId && resourceMode === "professional" ? { professional_id: newResourceId } : {}),
                ...(newResourceId && resourceMode === "room" ? { room_id: normalizeRoomResourceId(newResourceId) } : {}),
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
          onDuplicate={(initial) => setDialogState({ mode: "create", initial })}
        />
      )}
    </div>
  )
}

function normalizeResourceMode(value: string | null | undefined): ResourceMode {
  return value === "room" ? "room" : "professional"
}

function normalizeView(value: string | null | undefined): string {
  return value && ALLOWED_VIEWS.has(value) ? value : DEFAULT_VIEW
}

function toDateParam(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function normalizeRoomResourceId(id: string | undefined): string | null | undefined {
  if (!id) return undefined
  return id === NO_ROOM_RESOURCE_ID ? null : id
}

function getSelectedResourceId(arg: DateSelectArg): string | undefined {
  return (arg as DateSelectArg & { resource?: { id: string } }).resource?.id
}

function getDropResourceId(arg: EventDropArg): string | undefined {
  return (arg as EventDropArg & { newResource?: { id: string } }).newResource?.id
}
