"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createPatientAction, updatePatientAction, type PatientState } from "./actions"

type Initial = {
  id: string; first_name: string; last_name: string; dni: string | null
  birth_date: string | null; gender: string | null; phone: string | null; email: string | null
  address: string | null; city: string | null; postal_code: string | null
  notes_admin: string | null; referred_by: string | null
} | null

export function PatientForm({ initial }: { initial: Initial }) {
  const isEdit = !!initial
  const action = isEdit ? updatePatientAction : createPatientAction
  const [state, formAction, pending] = useActionState<PatientState, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {isEdit && initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="first_name" label="Nombre" required defaultValue={initial?.first_name} state={state} />
        <Field name="last_name" label="Apellidos" required defaultValue={initial?.last_name} state={state} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field name="dni" label="DNI" defaultValue={initial?.dni ?? ""} state={state} />
        <Field name="birth_date" label="Fecha nacimiento" type="date" defaultValue={initial?.birth_date ?? ""} state={state} />
        <div className="space-y-1.5">
          <Label htmlFor="gender">Género</Label>
          <Select name="gender" defaultValue={initial?.gender ?? "none"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="f">Femenino</SelectItem>
              <SelectItem value="m">Masculino</SelectItem>
              <SelectItem value="x">Otro</SelectItem>
              <SelectItem value="none">Prefiere no decir</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="phone" label="Teléfono" defaultValue={initial?.phone ?? ""} state={state} />
        <Field name="email" label="Email" type="email" defaultValue={initial?.email ?? ""} state={state} />
      </div>
      <Field name="address" label="Dirección" defaultValue={initial?.address ?? ""} state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="city" label="Ciudad" defaultValue={initial?.city ?? ""} state={state} />
        <Field name="postal_code" label="Código postal" defaultValue={initial?.postal_code ?? ""} state={state} />
      </div>
      <Field name="referred_by" label="¿Cómo nos conoció?" defaultValue={initial?.referred_by ?? ""} state={state} />
      <div className="space-y-1.5">
        <Label htmlFor="notes_admin">Notas administrativas</Label>
        <Textarea id="notes_admin" name="notes_admin" defaultValue={initial?.notes_admin ?? ""} rows={3} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : (isEdit ? "Guardar cambios" : "Crear paciente")}
      </Button>
    </form>
  )
}

function Field({
  name, label, type = "text", required, defaultValue, state,
}: {
  name: string; label: string; type?: string; required?: boolean
  defaultValue?: string; state: PatientState
}) {
  const errors = state?.fieldErrors?.[name]
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} />
      {errors?.[0] && <p className="text-sm text-destructive">{errors[0]}</p>}
    </div>
  )
}
