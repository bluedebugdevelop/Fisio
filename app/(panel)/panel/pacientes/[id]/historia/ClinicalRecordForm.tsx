"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveClinicalRecordAction, type RecordState } from "./actions"

type Initial = {
  id: string
  chief_complaint: string | null
  diagnosis: string | null
  medical_history: string | null
  current_medication: string | null
  allergies: string | null
  red_flags: string | null
  objectives: string | null
}

export function ClinicalRecordForm({ initial, patientId }: { initial: Initial; patientId: string }) {
  const [state, action, pending] = useActionState<RecordState, FormData>(saveClinicalRecordAction, null)
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={initial.id} />
      <input type="hidden" name="patient_id" value={patientId} />
      <Section name="chief_complaint" label="Motivo de consulta" initial={initial.chief_complaint ?? ""} />
      <Section name="diagnosis" label="Diagnóstico" initial={initial.diagnosis ?? ""} />
      <Section name="medical_history" label="Antecedentes médicos" initial={initial.medical_history ?? ""} />
      <Section name="current_medication" label="Medicación actual" initial={initial.current_medication ?? ""} />
      <Section name="allergies" label="Alergias" initial={initial.allergies ?? ""} />
      <Section name="red_flags" label="Banderas rojas / contraindicaciones" initial={initial.red_flags ?? ""} />
      <Section name="objectives" label="Objetivos del tratamiento" initial={initial.objectives ?? ""} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Guardado.</p>}
      <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
    </form>
  )
}

function Section({ name, label, initial }: { name: string; label: string; initial: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={initial} rows={3} />
    </div>
  )
}
