"use client"
import { useTransition, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { anonymizePatientAction } from "../actions"

export function DangerZone({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState("")

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <h3 className="text-sm font-semibold text-destructive">Zona peligrosa</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Anonimizar borra los datos personales del paciente conservando el historial clínico (necesario para auditoría).
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" className="mt-3">Anonimizar paciente</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar anonimización</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Escribe &quot;ANONIMIZAR&quot; para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="ANONIMIZAR" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive" disabled={confirm !== "ANONIMIZAR" || pending}
              onClick={() => start(() => anonymizePatientAction(patientId))}
            >
              {pending ? "Procesando..." : "Anonimizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
