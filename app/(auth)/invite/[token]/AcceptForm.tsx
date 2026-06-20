"use client"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { acceptInvitationAction } from "./actions"

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const [pending, start] = useTransition()
  return (
    <div className="space-y-4 text-sm">
      <p>Invitación dirigida a <strong>{email}</strong>.</p>
      <p className="text-muted-foreground">
        Asegúrate de haber iniciado sesión con ese email. Al aceptar te unirás a la clínica.
      </p>
      <Button onClick={() => start(() => acceptInvitationAction(token))} disabled={pending} className="w-full">
        {pending ? "Aceptando..." : "Aceptar invitación"}
      </Button>
    </div>
  )
}
