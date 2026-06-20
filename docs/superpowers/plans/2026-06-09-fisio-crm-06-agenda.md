# Fisio CRM — Fase 6: Agenda

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Calendario semanal funcional con creación, edición, movimiento, cancelación y cambios de estado de citas. Anti-solapamientos validados en cliente y servidor.

**Architecture:** Lógica de reglas en `lib/domain/appointment-rules.ts` (TDD). DB en `lib/db/appointments.ts`. Calendario en FullCalendar con vistas día/semana, recursos por profesional. Diálogo de creación/edición. Server actions para mutaciones.

**Tech Stack:** FullCalendar (`@fullcalendar/react`, daygrid, timegrid, interaction), date-fns, zod.

---

## Task 6.1: Lógica de dominio de citas (TDD)

**Files:**
- Create: `lib/domain/appointment-rules.ts`
- Create: `lib/domain/appointment-rules.test.ts`

- [ ] **Step 1: Escribir tests primero**

`lib/domain/appointment-rules.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import {
  canTransitionStatus, type AppointmentStatus,
  hasOverlap, validateAppointmentTimes,
} from "./appointment-rules"

describe("canTransitionStatus", () => {
  const allowed: [AppointmentStatus, AppointmentStatus[]][] = [
    ["scheduled", ["confirmed", "cancelled", "no_show"]],
    ["confirmed", ["checked_in", "cancelled", "no_show"]],
    ["checked_in", ["completed", "cancelled"]],
    ["completed", []],
    ["cancelled", []],
    ["no_show", []],
  ]
  it.each(allowed)("from %s allows expected transitions", (from, toList) => {
    expect(canTransitionStatus(from, from)).toBe(true)  // idempotent
    for (const to of toList) expect(canTransitionStatus(from, to)).toBe(true)
    const all: AppointmentStatus[] = ["scheduled","confirmed","checked_in","completed","no_show","cancelled"]
    for (const to of all) {
      if (to === from || toList.includes(to)) continue
      expect(canTransitionStatus(from, to)).toBe(false)
    }
  })
})

describe("validateAppointmentTimes", () => {
  it("rejects ends_at <= starts_at", () => {
    expect(() => validateAppointmentTimes(new Date("2026-06-10T10:00:00Z"), new Date("2026-06-10T10:00:00Z")))
      .toThrow(/ends_at/)
  })
  it("rejects duration < 5min", () => {
    expect(() => validateAppointmentTimes(new Date("2026-06-10T10:00:00Z"), new Date("2026-06-10T10:03:00Z")))
      .toThrow(/duración/)
  })
  it("accepts valid range", () => {
    expect(() => validateAppointmentTimes(new Date("2026-06-10T10:00:00Z"), new Date("2026-06-10T11:00:00Z")))
      .not.toThrow()
  })
})

describe("hasOverlap", () => {
  const A = { starts_at: "2026-06-10T10:00:00Z", ends_at: "2026-06-10T11:00:00Z" }
  it("detects pure overlap", () => {
    expect(hasOverlap(A, { starts_at: "2026-06-10T10:30:00Z", ends_at: "2026-06-10T11:30:00Z" })).toBe(true)
  })
  it("detects containment", () => {
    expect(hasOverlap(A, { starts_at: "2026-06-10T10:10:00Z", ends_at: "2026-06-10T10:50:00Z" })).toBe(true)
  })
  it("returns false for touching ranges (half-open [start,end))", () => {
    expect(hasOverlap(A, { starts_at: "2026-06-10T11:00:00Z", ends_at: "2026-06-10T12:00:00Z" })).toBe(false)
    expect(hasOverlap(A, { starts_at: "2026-06-10T09:00:00Z", ends_at: "2026-06-10T10:00:00Z" })).toBe(false)
  })
  it("returns false for disjoint ranges", () => {
    expect(hasOverlap(A, { starts_at: "2026-06-10T12:00:00Z", ends_at: "2026-06-10T13:00:00Z" })).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar — tests deben fallar**

```bash
pnpm test
```

Esperado: 3+ tests fallan porque las funciones no existen.

- [ ] **Step 3: Implementar `lib/domain/appointment-rules.ts`**

```ts
export type AppointmentStatus =
  | "scheduled" | "confirmed" | "checked_in" | "completed" | "no_show" | "cancelled"

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["completed", "cancelled"],
  completed: [],
  no_show: [],
  cancelled: [],
}

export function canTransitionStatus(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (from === to) return true
  return TRANSITIONS[from].includes(to)
}

export function validateAppointmentTimes(startsAt: Date, endsAt: Date): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("ends_at debe ser posterior a starts_at")
  }
  const minutes = (endsAt.getTime() - startsAt.getTime()) / 60000
  if (minutes < 5) throw new Error("La duración mínima es 5 minutos")
  if (minutes > 480) throw new Error("La duración máxima es 8 horas")
}

type Range = { starts_at: string; ends_at: string }

export function hasOverlap(a: Range, b: Range): boolean {
  const aStart = new Date(a.starts_at).getTime()
  const aEnd = new Date(a.ends_at).getTime()
  const bStart = new Date(b.starts_at).getTime()
  const bEnd = new Date(b.ends_at).getTime()
  return aStart < bEnd && bStart < aEnd
}
```

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
pnpm test
```

Esperado: todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): appointment rules (transitions, time validation, overlap)"
```

---

## Task 6.2: Capa de datos de citas

**Files:**
- Create: `lib/db/appointments.ts`

- [ ] **Step 1: Crear**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

type Insert = Database["public"]["Tables"]["appointments"]["Insert"]
type Update = Database["public"]["Tables"]["appointments"]["Update"]
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"]

export type AppointmentEvent = {
  id: string
  patient_id: string
  professional_id: string
  room_id: string | null
  service_type_id: string | null
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  notes_for_reception: string | null
  patients: { id: string; first_name: string; last_name: string } | null
  professionals: { id: string; display_name: string; color: string } | null
  rooms: { id: string; name: string } | null
  service_types: { id: string; name: string; color: string } | null
}

export async function listAppointmentsInRange(
  clinicId: string,
  from: string,
  to: string,
  opts: { professionalIds?: string[] } = {},
): Promise<AppointmentEvent[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase
    .from("appointments")
    .select(`
      id, patient_id, professional_id, room_id, service_type_id,
      starts_at, ends_at, status, notes_for_reception,
      patients(id, first_name, last_name),
      professionals(id, display_name, color),
      rooms(id, name),
      service_types(id, name, color)
    `)
    .eq("clinic_id", clinicId)
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at")
  if (opts.professionalIds?.length) q = q.in("professional_id", opts.professionalIds)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as AppointmentEvent[]
}

export async function getAppointment(id: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *, patients(id, first_name, last_name),
      professionals(id, display_name, color),
      rooms(id, name),
      service_types(id, name, color, duration_minutes)
    `)
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export async function createAppointment(input: Insert) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("appointments")
    .insert(input)
    .select("id")
    .single()
  if (error) throw error
  return data.id
}

export async function updateAppointment(id: string, input: Update) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("appointments").update(input).eq("id", id)
  if (error) throw error
}

export async function transitionStatus(id: string, status: AppointmentStatus, extras: Update = {}) {
  return updateAppointment(id, { status, ...extras })
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(db): appointments CRUD queries"
```

---

## Task 6.3: Server actions de citas

**Files:**
- Create: `app/(panel)/panel/agenda/actions.ts`

- [ ] **Step 1: Crear**

```ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import {
  createAppointment, updateAppointment, transitionStatus,
} from "@/lib/db/appointments"
import { canTransitionStatus, validateAppointmentTimes } from "@/lib/domain/appointment-rules"
import type { AppointmentStatus } from "@/lib/db/appointments"

const baseSchema = z.object({
  patient_id: z.string().uuid(),
  professional_id: z.string().uuid(),
  room_id: z.string().uuid().optional().nullable().or(z.literal("")),
  service_type_id: z.string().uuid().optional().nullable().or(z.literal("")),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  notes_for_reception: z.string().optional().or(z.literal("")),
})

export type AppointmentState = { error?: string; fieldErrors?: Record<string, string[]>; id?: string } | null

export async function createAppointmentAction(_prev: AppointmentState, formData: FormData): Promise<AppointmentState> {
  const { user, active } = await requireActiveClinic()
  const parsed = baseSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    validateAppointmentTimes(new Date(parsed.data.starts_at), new Date(parsed.data.ends_at))
    const id = await createAppointment({
      clinic_id: active.clinic_id,
      patient_id: parsed.data.patient_id,
      professional_id: parsed.data.professional_id,
      room_id: parsed.data.room_id || null,
      service_type_id: parsed.data.service_type_id || null,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      notes_for_reception: parsed.data.notes_for_reception || null,
      created_by: user.id,
    })
    revalidatePath("/panel/agenda")
    return { id }
  } catch (e) {
    if (e instanceof Error && e.message.includes("exclusion constraint")) {
      return { error: "Solapamiento: ya hay una cita para ese fisio o sala en ese intervalo." }
    }
    return { error: e instanceof Error ? e.message : "Error al crear la cita" }
  }
}

const updateSchema = baseSchema.extend({ id: z.string().uuid() })

export async function updateAppointmentAction(_prev: AppointmentState, formData: FormData): Promise<AppointmentState> {
  await requireActiveClinic()
  const parsed = updateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    validateAppointmentTimes(new Date(parsed.data.starts_at), new Date(parsed.data.ends_at))
    await updateAppointment(parsed.data.id, {
      patient_id: parsed.data.patient_id,
      professional_id: parsed.data.professional_id,
      room_id: parsed.data.room_id || null,
      service_type_id: parsed.data.service_type_id || null,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      notes_for_reception: parsed.data.notes_for_reception || null,
    })
    revalidatePath("/panel/agenda")
    return { id: parsed.data.id }
  } catch (e) {
    if (e instanceof Error && e.message.includes("exclusion constraint")) {
      return { error: "Solapamiento con otra cita." }
    }
    return { error: e instanceof Error ? e.message : "Error al actualizar" }
  }
}

const moveSchema = z.object({
  id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  professional_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional().nullable(),
})

export async function moveAppointmentAction(input: z.infer<typeof moveSchema>) {
  await requireActiveClinic()
  const parsed = moveSchema.parse(input)
  validateAppointmentTimes(new Date(parsed.starts_at), new Date(parsed.ends_at))
  try {
    await updateAppointment(parsed.id, {
      starts_at: parsed.starts_at,
      ends_at: parsed.ends_at,
      ...(parsed.professional_id ? { professional_id: parsed.professional_id } : {}),
      ...(parsed.room_id !== undefined ? { room_id: parsed.room_id } : {}),
    })
    revalidatePath("/panel/agenda")
  } catch (e) {
    if (e instanceof Error && e.message.includes("exclusion constraint")) {
      throw new Error("Solapamiento")
    }
    throw e
  }
}

export async function changeStatusAction(input: {
  id: string
  from: AppointmentStatus
  to: AppointmentStatus
  reason?: string
}) {
  const { user } = await requireActiveClinic()
  if (!canTransitionStatus(input.from, input.to)) {
    throw new Error(`Transición no permitida: ${input.from} → ${input.to}`)
  }
  const extras: Record<string, unknown> = {}
  if (input.to === "cancelled") {
    if (!input.reason) throw new Error("Motivo de cancelación obligatorio")
    extras.cancel_reason = input.reason
    extras.cancelled_by = user.id
    extras.cancelled_at = new Date().toISOString()
  }
  await transitionStatus(input.id, input.to, extras)
  revalidatePath("/panel/agenda")
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(agenda): server actions for appointments"
```

---

## Task 6.4: Página de agenda + carga de eventos

**Files:**
- Modify: `app/(panel)/panel/agenda/page.tsx`
- Create: `app/(panel)/panel/agenda/CalendarView.tsx`
- Create: `app/(panel)/panel/agenda/AppointmentDialog.tsx`
- Create: `app/(panel)/panel/agenda/PatientCombobox.tsx`

- [ ] **Step 1: Reescribir `agenda/page.tsx`**

```tsx
import { startOfWeek, endOfWeek, addDays } from "date-fns"
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { listAppointmentsInRange } from "@/lib/db/appointments"
import { listProfessionals } from "@/lib/db/professionals"
import { listRooms } from "@/lib/db/rooms"
import { listServiceTypes } from "@/lib/db/service-types"
import { CalendarView } from "./CalendarView"

export default async function AgendaPage({
  searchParams,
}: { searchParams: Promise<{ date?: string }> }) {
  const { active } = await requireActiveClinic()
  const sp = await searchParams
  const focus = sp.date ? new Date(sp.date) : new Date()
  const from = startOfWeek(focus, { weekStartsOn: 1 })
  const to = addDays(endOfWeek(focus, { weekStartsOn: 1 }), 1)

  const [appointments, professionals, rooms, serviceTypes] = await Promise.all([
    listAppointmentsInRange(active.clinic_id, from.toISOString(), to.toISOString()),
    listProfessionals(active.clinic_id),
    listRooms(active.clinic_id),
    listServiceTypes(active.clinic_id),
  ])

  return (
    <>
      <PageHeader title="Agenda" description="Calendario de la clínica." />
      <CalendarView
        initialDate={focus.toISOString()}
        appointments={appointments}
        professionals={professionals}
        rooms={rooms}
        serviceTypes={serviceTypes}
      />
    </>
  )
}
```

- [ ] **Step 2: `CalendarView.tsx`**

```tsx
"use client"
import { useMemo, useRef, useState, useTransition } from "react"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import type {
  EventInput, DateSelectArg, EventClickArg, EventDropArg, EventResizeDoneArg,
} from "@fullcalendar/core"
import { AppointmentDialog } from "./AppointmentDialog"
import type { AppointmentEvent } from "@/lib/db/appointments"
import { moveAppointmentAction } from "./actions"

type Professional = { id: string; display_name: string; color: string; default_appointment_minutes: number; is_active: boolean }
type Room = { id: string; name: string; is_active: boolean }
type ServiceType = { id: string; name: string; color: string; duration_minutes: number; is_active: boolean }

export function CalendarView({
  initialDate, appointments, professionals, rooms, serviceTypes,
}: {
  initialDate: string
  appointments: AppointmentEvent[]
  professionals: Professional[]
  rooms: Room[]
  serviceTypes: ServiceType[]
}) {
  const ref = useRef<FullCalendar>(null)
  const [dialogState, setDialogState] = useState<
    | { mode: "create"; initial: Partial<AppointmentEvent> }
    | { mode: "edit"; initial: AppointmentEvent }
    | null
  >(null)
  const [pending, start] = useTransition()

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
```

- [ ] **Step 3: Commit (parcial; falta dialog)**

```bash
git add -A
git commit -m "feat(agenda): calendar view with drag&drop"
```

---

## Task 6.5: Dialog de cita (crear/editar + cambio de estado + cancelar)

**Files:**
- Create: `app/(panel)/panel/agenda/AppointmentDialog.tsx`
- Create: `app/(panel)/panel/agenda/PatientCombobox.tsx`

- [ ] **Step 1: `PatientCombobox.tsx` — buscador de pacientes con server lookup**

Para no cargar todos los pacientes en cliente, exponemos una RPC ligera:

`supabase/migrations/0011_patient_search.sql`:

```sql
create or replace function public.search_patients(p_clinic uuid, p_query text)
returns table(id uuid, label text)
language sql security definer set search_path = public as $$
  select id,
    (last_name || ', ' || first_name || coalesce(' · ' || dni, '')) as label
  from patients
  where clinic_id = p_clinic
    and deleted_at is null
    and (
      p_query is null or p_query = ''
      or first_name ilike '%' || p_query || '%'
      or last_name ilike '%' || p_query || '%'
      or dni ilike '%' || p_query || '%'
      or phone ilike '%' || p_query || '%'
    )
  order by last_name, first_name
  limit 20
$$;

grant execute on function public.search_patients(uuid, text) to authenticated;
```

Aplicar:

```bash
pnpm dlx supabase db push
pnpm db:types
```

`PatientCombobox.tsx`:

```tsx
"use client"
import { useEffect, useRef, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Input } from "@/components/ui/input"

type Item = { id: string; label: string }

export function PatientCombobox({
  clinicId, value, onChange, initialLabel,
}: {
  clinicId: string
  value: string | null
  onChange: (id: string, label: string) => void
  initialLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(initialLabel ?? "")
  const [items, setItems] = useState<Item[]>([])
  const supabase = useRef(createSupabaseBrowserClient())

  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      const { data } = await supabase.current.rpc("search_patients", {
        p_clinic: clinicId, p_query: query,
      })
      setItems((data ?? []) as Item[])
    }, 150)
    return () => clearTimeout(t)
  }, [query, open, clinicId])

  return (
    <div className="relative">
      <input type="hidden" name="patient_id" value={value ?? ""} />
      <Input
        placeholder="Buscar paciente..."
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && items.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(it.id, it.label)
                  setQuery(it.label)
                  setOpen(false)
                }}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `AppointmentDialog.tsx`**

```tsx
"use client"
import { useActionState, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PatientCombobox } from "./PatientCombobox"
import {
  createAppointmentAction, updateAppointmentAction, changeStatusAction,
  type AppointmentState,
} from "./actions"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import type { AppointmentEvent } from "@/lib/db/appointments"

type Professional = { id: string; display_name: string; default_appointment_minutes: number; is_active: boolean }
type Room = { id: string; name: string; is_active: boolean }
type ServiceType = { id: string; name: string; duration_minutes: number; is_active: boolean }

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programada", confirmed: "Confirmada", checked_in: "Llegó",
  completed: "Realizada", no_show: "No presentado", cancelled: "Cancelada",
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(local: string) {
  return new Date(local).toISOString()
}

export function AppointmentDialog({
  mode, initial, professionals, rooms, serviceTypes, onClose,
}: {
  mode: "create" | "edit"
  initial: Partial<AppointmentEvent>
  professionals: Professional[]
  rooms: Room[]
  serviceTypes: ServiceType[]
  onClose: () => void
}) {
  const router = useRouter()
  const isEdit = mode === "edit"
  const action = isEdit ? updateAppointmentAction : createAppointmentAction
  const [state, formAction, pending] = useActionState<AppointmentState, FormData>(action, null)
  const [patientId, setPatientId] = useState<string | null>(initial.patient_id ?? null)
  const [startLocal, setStartLocal] = useState(toLocalInput(initial.starts_at ?? new Date().toISOString()))
  const [endLocal, setEndLocal] = useState(toLocalInput(initial.ends_at ?? new Date(Date.now() + 45 * 60_000).toISOString()))

  useEffect(() => {
    if (state?.id && !state.error && !state.fieldErrors) {
      router.refresh()
      onClose()
    }
  }, [state, router, onClose])

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cita" : "Nueva cita"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={(initial as AppointmentEvent).id} />}
          <input type="hidden" name="starts_at" value={fromLocalInput(startLocal)} />
          <input type="hidden" name="ends_at" value={fromLocalInput(endLocal)} />

          <div className="space-y-1.5">
            <Label>Paciente</Label>
            <PatientCombobox
              clinicId={(initial as AppointmentEvent).patients?.id ? "" : ""}  /* replaced below */
              value={patientId}
              onChange={(id) => setPatientId(id)}
              initialLabel={initial.patients ? `${initial.patients.last_name}, ${initial.patients.first_name}` : ""}
            />
            {/* IMPORTANT: clinicId arriba debe ser el activeClinicId. Lo pasaremos como prop al dialog. */}
            {state?.fieldErrors?.patient_id && (
              <p className="text-sm text-destructive">{state.fieldErrors.patient_id[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="professional_id">Profesional</Label>
              <Select name="professional_id" defaultValue={initial.professional_id ?? professionals[0]?.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {professionals.filter((p) => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room_id">Sala</Label>
              <Select name="room_id" defaultValue={initial.room_id ?? ""}>
                <SelectTrigger><SelectValue placeholder="Sin sala" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin sala</SelectItem>
                  {rooms.filter((r) => r.is_active).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="service_type_id">Tipo de servicio</Label>
            <Select
              name="service_type_id"
              defaultValue={initial.service_type_id ?? ""}
              onValueChange={(v) => {
                const st = serviceTypes.find((s) => s.id === v)
                if (st) {
                  const newEnd = new Date(new Date(fromLocalInput(startLocal)).getTime() + st.duration_minutes * 60_000)
                  setEndLocal(toLocalInput(newEnd.toISOString()))
                }
              }}
            >
              <SelectTrigger><SelectValue placeholder="Sin tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin tipo</SelectItem>
                {serviceTypes.filter((s) => s.is_active).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Inicio</Label>
              <Input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Fin</Label>
              <Input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes_for_reception">Notas para recepción</Label>
            <Textarea id="notes_for_reception" name="notes_for_reception"
              defaultValue={initial.notes_for_reception ?? ""} rows={2} />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter className="gap-2 sm:gap-2">
            {isEdit && <StatusButtons appointment={initial as AppointmentEvent} onChanged={() => { router.refresh(); onClose() }} />}
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatusButtons({ appointment, onChanged }: { appointment: AppointmentEvent; onChanged: () => void }) {
  const [pending, start] = useTransition()
  const transitions: Record<string, { to: string; label: string; variant?: "default" | "destructive" | "secondary" }[]> = {
    scheduled: [
      { to: "confirmed", label: "Confirmar", variant: "secondary" },
      { to: "cancelled", label: "Cancelar", variant: "destructive" },
      { to: "no_show", label: "No vino", variant: "destructive" },
    ],
    confirmed: [
      { to: "checked_in", label: "Marcar llegada", variant: "secondary" },
      { to: "cancelled", label: "Cancelar", variant: "destructive" },
      { to: "no_show", label: "No vino", variant: "destructive" },
    ],
    checked_in: [
      { to: "completed", label: "Marcar realizada", variant: "secondary" },
      { to: "cancelled", label: "Cancelar", variant: "destructive" },
    ],
  }
  const opts = transitions[appointment.status] ?? []
  if (opts.length === 0) {
    return <span className="text-xs text-muted-foreground">Estado: {STATUS_LABEL[appointment.status]}</span>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <Button
          key={o.to} type="button" variant={o.variant ?? "secondary"} size="sm" disabled={pending}
          onClick={() => start(async () => {
            let reason: string | undefined
            if (o.to === "cancelled") {
              reason = prompt("Motivo de la cancelación") ?? undefined
              if (!reason) return
            }
            try {
              await changeStatusAction({ id: appointment.id, from: appointment.status, to: o.to as any, reason })
              onChanged()
            } catch (e) {
              alert(e instanceof Error ? e.message : "Error")
            }
          })}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}
```

**Nota:** En el código del Combobox arriba aparece `clinicId={""}`. Hay que pasar el `active.clinic_id` al `CalendarView` y de ahí al `AppointmentDialog` como prop adicional. Ajustar:

- En `agenda/page.tsx`: pasar `clinicId={active.clinic_id}` al `<CalendarView>`.
- En `CalendarView`: añadir prop `clinicId: string` y pasarla al `AppointmentDialog`.
- En `AppointmentDialog`: añadir prop `clinicId: string` y usarla en `<PatientCombobox clinicId={clinicId} ...>`.

Hacer este ajuste antes de probar.

- [ ] **Step 3: Verificación manual**

```bash
pnpm dev
```

1. Ir a `/panel/agenda`.
2. Seleccionar un rango con el ratón → abre dialog de creación.
3. Elegir paciente, fisio, fecha → guardar. Aparece en el calendario.
4. Arrastrar la cita a otro horario → se persiste.
5. Crear otra cita solapando → debe fallar con mensaje.
6. Hacer click en una cita → editar / cambiar estado / cancelar.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(agenda): appointment dialog with create/edit/status/cancel"
```

---

## Task 6.6: Filtro por profesional

**Files:**
- Modify: `app/(panel)/panel/agenda/CalendarView.tsx` (añadir UI de filtro)
- Modify: `app/(panel)/panel/agenda/page.tsx` (leer searchParams)

- [ ] **Step 1: En `page.tsx`, leer `professional` del query string y pasarlo a `listAppointmentsInRange`**

```ts
const ids = sp.professional?.split(",").filter(Boolean) ?? []
const appointments = await listAppointmentsInRange(active.clinic_id, from.toISOString(), to.toISOString(), {
  professionalIds: ids.length ? ids : undefined,
})
```

Y pasar `selectedProfessionalIds={ids}` a `CalendarView`.

- [ ] **Step 2: En `CalendarView` añadir un row de checkboxes encima del calendario que actualiza `?professional=` con `router.replace`**

```tsx
import { useRouter, useSearchParams } from "next/navigation"
// ...
const router = useRouter()
const sp = useSearchParams()
const selected = (sp.get("professional") ?? "").split(",").filter(Boolean)
function toggle(id: string) {
  const set = new Set(selected)
  if (set.has(id)) set.delete(id); else set.add(id)
  const next = new URLSearchParams(sp.toString())
  if (set.size === 0) next.delete("professional"); else next.set("professional", Array.from(set).join(","))
  router.replace(`/panel/agenda?${next.toString()}`)
}
```

Render encima de `<FullCalendar>`:

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(agenda): filter calendar by professional"
```

---

## Self-check de la fase

```bash
pnpm typecheck && pnpm test && pnpm build
```

Manual:
- Crear, mover, editar y cancelar citas.
- Solapamientos son rechazados con mensaje.
- Cambios de estado siguen las transiciones permitidas.
- Filtro por fisio oculta/muestra eventos.

## Siguiente fase

`2026-06-09-fisio-crm-07-clinical.md` — Historia clínica, notas de sesión SOAP y documentos.
