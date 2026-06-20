"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bootstrapClinicAction, type OnboardingState } from "./actions"

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(bootstrapClinicAction, null)
  return (
    <form action={action} className="space-y-4">
      <Field name="name" label="Nombre de la clínica" required state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="legal_name" label="Razón social" state={state} />
        <Field name="cif" label="CIF" state={state} />
      </div>
      <Field name="address" label="Dirección" state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="city" label="Ciudad" state={state} />
        <Field name="postal_code" label="Código postal" state={state} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="phone" label="Teléfono" state={state} />
        <Field name="email" label="Email de contacto" type="email" state={state} />
      </div>
      <input type="hidden" name="timezone" value="Europe/Madrid" />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando clínica..." : "Crear clínica"}
      </Button>
    </form>
  )
}

function Field({
  name, label, type = "text", required, state,
}: {
  name: string; label: string; type?: string; required?: boolean; state: OnboardingState
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={name} name={name} type={type} required={required} />
      {state?.fieldErrors?.[name] && (
        <p className="text-sm text-destructive">{state.fieldErrors[name][0]}</p>
      )}
    </div>
  )
}
