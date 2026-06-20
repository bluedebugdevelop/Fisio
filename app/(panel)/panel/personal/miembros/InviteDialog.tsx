"use client"
import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createInvitationAction, type InviteState } from "./actions"

export function InviteDialog() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvitationAction, null)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Invitar miembro</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva invitación</DialogTitle></DialogHeader>
        <form action={action} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            {state?.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Rol</Label>
            <Select name="role" defaultValue="physio">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="physio">Fisioterapeuta</SelectItem>
                <SelectItem value="reception">Recepción</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.token && (
            <div className="rounded-md bg-muted p-3 text-xs">
              <div className="font-semibold">Enlace para enviar al invitado:</div>
              <code className="break-all">
                {`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${state.token}`}
              </code>
              <p className="mt-2 text-muted-foreground">
                Cópialo y envíalo por email. (En esta fase no enviamos email automático.)
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creando..." : "Crear invitación"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
