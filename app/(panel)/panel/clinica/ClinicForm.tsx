"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateClinicAction, type ClinicFormState } from "./actions"

type ClinicInitial = {
  id: string
  name: string
  legal_name: string | null
  cif: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  timezone: string
  dpo_contact: string | null
}

export function ClinicForm({ initial }: { initial: ClinicInitial }) {
  const [state, action, pending] = useActionState<ClinicFormState, FormData>(updateClinicAction, null)
  return (
    <form action={action} className="space-y-4">
      <Field name="name" label="Nombre de la clínica" required defaultValue={initial.name} state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="legal_name" label="Razón social" defaultValue={initial.legal_name ?? ""} state={state} />
        <Field name="cif" label="CIF" defaultValue={initial.cif ?? ""} state={state} />
      </div>
      <Field name="address" label="Dirección" defaultValue={initial.address ?? ""} state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="city" label="Ciudad" defaultValue={initial.city ?? ""} state={state} />
        <Field name="postal_code" label="Código postal" defaultValue={initial.postal_code ?? ""} state={state} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="phone" label="Teléfono" defaultValue={initial.phone ?? ""} state={state} />
        <Field name="email" label="Email de contacto" type="email" defaultValue={initial.email ?? ""} state={state} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="timezone" label="Zona horaria" defaultValue={initial.timezone} state={state} />
        <Field name="dpo_contact" label="Contacto DPO" defaultValue={initial.dpo_contact ?? ""} state={state} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">Datos guardados correctamente.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  )
}

function Field({
  name, label, type = "text", required, defaultValue, state,
}: {
  name: string; label: string; type?: string; required?: boolean
  defaultValue?: string; state: ClinicFormState
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} />
      {state?.fieldErrors?.[name] && (
        <p className="text-sm text-destructive">{state.fieldErrors[name][0]}</p>
      )}
    </div>
  )
}
