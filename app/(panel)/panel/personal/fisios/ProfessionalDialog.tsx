"use client"
import { useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveProfessionalAction, type ProfessionalState } from "./actions"

type Candidate = { user_id: string; email: string; name: string | null }
type Initial = {
  id: string; user_id: string; display_name: string; license_number: string | null
  specialty: string | null; color: string; default_appointment_minutes: number
}

export function ProfessionalDialog({
  candidates, initial,
}: { candidates: Candidate[]; initial?: Initial }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<ProfessionalState, FormData>(saveProfessionalAction, null)
  const isEdit = !!initial

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? "ghost" : "default"} size="sm">
          {isEdit ? "Editar" : "Añadir fisio"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar fisio" : "Nuevo fisio"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => { await action(fd); if (!state?.error && !state?.fieldErrors) setOpen(false) }}
          className="space-y-3"
        >
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="user_id">Usuario</Label>
            <Select name="user_id" defaultValue={initial?.user_id}>
              <SelectTrigger><SelectValue placeholder="Selecciona un miembro" /></SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id}>{c.name ?? c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.fieldErrors?.user_id && <p className="text-sm text-destructive">{state.fieldErrors.user_id[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Nombre visible</Label>
            <Input id="display_name" name="display_name" defaultValue={initial?.display_name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="license_number">Nº colegiado</Label>
              <Input id="license_number" name="license_number" defaultValue={initial?.license_number ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="specialty">Especialidad</Label>
              <Input id="specialty" name="specialty" defaultValue={initial?.specialty ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="color">Color (hex)</Label>
              <Input id="color" name="color" defaultValue={initial?.color ?? "#1f6feb"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default_appointment_minutes">Duración por defecto (min)</Label>
              <Input id="default_appointment_minutes" name="default_appointment_minutes"
                     type="number" min={5} max={480} defaultValue={initial?.default_appointment_minutes ?? 45} />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
