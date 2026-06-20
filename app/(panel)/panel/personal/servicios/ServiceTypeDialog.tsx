"use client"
import { useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveServiceTypeAction, type ServiceTypeState } from "./actions"

type Initial = {
  id: string; name: string; duration_minutes: number; color: string
  price_cents: number | null
}

export function ServiceTypeDialog({ initial }: { initial?: Initial }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<ServiceTypeState, FormData>(saveServiceTypeAction, null)
  const isEdit = !!initial
  const priceDefault = initial?.price_cents != null ? (initial.price_cents / 100).toFixed(2) : ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? "ghost" : "default"} size="sm">
          {isEdit ? "Editar" : "Añadir servicio"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tipo de servicio" : "Nuevo tipo de servicio"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => { await action(fd); if (!state?.error && !state?.fieldErrors) setOpen(false) }}
          className="space-y-3"
        >
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={initial?.name} required />
            {state?.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="duration_minutes">Duración (min)</Label>
              <Input id="duration_minutes" name="duration_minutes" type="number" min={5} max={480}
                     defaultValue={initial?.duration_minutes ?? 45} required />
              {state?.fieldErrors?.duration_minutes && <p className="text-sm text-destructive">{state.fieldErrors.duration_minutes[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price_euros">Precio (€)</Label>
              <Input id="price_euros" name="price_euros" type="number" step="0.01" min={0} defaultValue={priceDefault} />
              {state?.fieldErrors?.price_euros && <p className="text-sm text-destructive">{state.fieldErrors.price_euros[0]}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="color">Color (hex)</Label>
            <Input id="color" name="color" defaultValue={initial?.color ?? "#1f6feb"} required />
            {state?.fieldErrors?.color && <p className="text-sm text-destructive">{state.fieldErrors.color[0]}</p>}
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
