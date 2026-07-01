"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signupAction, type ActionState } from "../actions"

export function SignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signupAction, null)
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre y apellidos</Label>
        <Input id="name" name="name" autoComplete="name" required />
        {state?.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email profesional</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state?.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        {state?.fieldErrors?.password && <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando..." : "Crear cuenta"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Al continuar aceptas la política de privacidad y el aviso legal.
      </p>
    </form>
  )
}
