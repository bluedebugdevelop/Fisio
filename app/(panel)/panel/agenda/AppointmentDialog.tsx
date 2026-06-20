"use client"
import { useActionState, useState, useTransition, useEffect } from "react"
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
import type { AppointmentEvent, AppointmentStatus } from "@/lib/db/appointments"

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
  clinicId, mode, initial, professionals, rooms, serviceTypes, onClose,
}: {
  clinicId: string
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
              clinicId={clinicId}
              value={patientId}
              onChange={(id) => setPatientId(id)}
              initialLabel={initial.patients ? `${initial.patients.last_name}, ${initial.patients.first_name}` : ""}
            />
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
              await changeStatusAction({ id: appointment.id, from: appointment.status, to: o.to as AppointmentStatus, reason })
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
