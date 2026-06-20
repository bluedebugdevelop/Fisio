"use client"
import { useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveRoomAction, type RoomState } from "./actions"

type Initial = {
  id: string; name: string; kind: string; capacity: number; color: string
}

export function RoomDialog({ initial }: { initial?: Initial }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<RoomState, FormData>(saveRoomAction, null)
  const isEdit = !!initial

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? "ghost" : "default"} size="sm">
          {isEdit ? "Editar" : "Añadir sala"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar sala" : "Nueva sala"}</DialogTitle>
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
          <div className="space-y-1.5">
            <Label htmlFor="kind">Tipo</Label>
            <Select name="kind" defaultValue={initial?.kind ?? "consulta"}>
              <SelectTrigger><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="gimnasio">Gimnasio</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            {state?.fieldErrors?.kind && <p className="text-sm text-destructive">{state.fieldErrors.kind[0]}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacidad</Label>
              <Input id="capacity" name="capacity" type="number" min={1} max={50} defaultValue={initial?.capacity ?? 1} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Color (hex)</Label>
              <Input id="color" name="color" defaultValue={initial?.color ?? "#1f6feb"} required />
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
