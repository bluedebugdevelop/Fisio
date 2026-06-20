"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveSessionNoteAction, type SessionNoteState } from "../actions"

type Initial = {
  id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  techniques: string[]
  home_program: string | null
  pain_pre: number | null
  pain_post: number | null
} | null

export function SessionNoteForm({
  patientId, appointmentId, initial, disabled,
}: {
  patientId: string
  appointmentId: string
  initial: Initial
  disabled: boolean
}) {
  const [state, action, pending] = useActionState<SessionNoteState, FormData>(saveSessionNoteAction, null)
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="appointment_id" value={appointmentId} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field name="subjective" label="S — Subjetivo" defaultValue={initial?.subjective ?? ""} disabled={disabled} />
      <Field name="objective" label="O — Objetivo" defaultValue={initial?.objective ?? ""} disabled={disabled} />
      <Field name="assessment" label="A — Valoración" defaultValue={initial?.assessment ?? ""} disabled={disabled} />
      <Field name="plan" label="P — Plan" defaultValue={initial?.plan ?? ""} disabled={disabled} />
      <div className="space-y-1.5">
        <Label htmlFor="techniques">Técnicas aplicadas (separadas por coma)</Label>
        <Input id="techniques" name="techniques"
               defaultValue={(initial?.techniques ?? []).join(", ")} disabled={disabled} />
      </div>
      <Field name="home_program" label="Pauta para casa" defaultValue={initial?.home_program ?? ""} disabled={disabled} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pain_pre">EVA antes (0-10)</Label>
          <Input id="pain_pre" name="pain_pre" type="number" min={0} max={10}
                 defaultValue={initial?.pain_pre ?? ""} disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pain_post">EVA después (0-10)</Label>
          <Input id="pain_post" name="pain_post" type="number" min={0} max={10}
                 defaultValue={initial?.pain_post ?? ""} disabled={disabled} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Nota guardada.</p>}
      <Button type="submit" disabled={pending || disabled}>{pending ? "Guardando..." : "Guardar nota"}</Button>
    </form>
  )
}

function Field({ name, label, defaultValue, disabled }: { name: string; label: string; defaultValue: string; disabled: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={defaultValue} rows={3} disabled={disabled} />
    </div>
  )
}
