"use client"
import { useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { registerDocumentAction } from "./actions"

const KINDS = [
  { value: "informe", label: "Informe" },
  { value: "prueba_imagen", label: "Prueba de imagen" },
  { value: "consentimiento", label: "Consentimiento" },
  { value: "receta", label: "Receta" },
  { value: "otro", label: "Otro" },
] as const

export function DocumentUploader({ patientId, clinicId }: { patientId: string; clinicId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseBrowserClient()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Subir documento</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Subir documento</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const file = fileRef.current?.files?.[0]
            if (!file) { setError("Selecciona un archivo"); return }
            const kind = String(fd.get("kind"))
            const notes = String(fd.get("notes") ?? "")
            start(async () => {
              setError(null)
              const ext = file.name.split(".").pop() ?? "bin"
              const path = `clinic_${clinicId}/patient_${patientId}/${crypto.randomUUID()}.${ext}`
              const { error: upErr } = await supabase.storage.from("patient-documents").upload(path, file, {
                contentType: file.type, upsert: false,
              })
              if (upErr) { setError(upErr.message); return }
              const reg = new FormData()
              reg.set("patient_id", patientId)
              reg.set("kind", kind)
              reg.set("filename", file.name)
              reg.set("mime", file.type)
              reg.set("size_bytes", String(file.size))
              reg.set("storage_path", path)
              reg.set("notes", notes)
              await registerDocumentAction(reg)
              setOpen(false)
            })
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="file">Archivo</Label>
            <input ref={fileRef} id="file" name="file" type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp" required
              className="block w-full text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kind">Tipo</Label>
            <Select name="kind" defaultValue="informe">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Input id="notes" name="notes" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Subiendo..." : "Subir"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
