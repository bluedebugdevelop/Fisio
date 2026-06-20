"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { publishConsentAction, type ConsentState } from "./actions"

export function ConsentForm() {
  const [state, action, pending] = useActionState<ConsentState, FormData>(publishConsentAction, null)
  return (
    <form action={action} className="max-w-2xl space-y-4 rounded-lg border bg-card p-6">
      <div className="space-y-1.5">
        <Label htmlFor="kind">Tipo</Label>
        <Select name="kind" defaultValue="tratamiento">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tratamiento">Tratamiento</SelectItem>
            <SelectItem value="comunicaciones">Comunicaciones</SelectItem>
            <SelectItem value="imagen">Imagen</SelectItem>
            <SelectItem value="menores">Menores</SelectItem>
          </SelectContent>
        </Select>
        {state?.fieldErrors?.kind && <p className="text-sm text-destructive">{state.fieldErrors.kind[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required />
        {state?.fieldErrors?.title && <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body_markdown">Texto (Markdown)</Label>
        <Textarea id="body_markdown" name="body_markdown" rows={10} required />
        {state?.fieldErrors?.body_markdown && <p className="text-sm text-destructive">{state.fieldErrors.body_markdown[0]}</p>}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">Nueva versión publicada.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Publicando..." : "Publicar versión"}
      </Button>
    </form>
  )
}
