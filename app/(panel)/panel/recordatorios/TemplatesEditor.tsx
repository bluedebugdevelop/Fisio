"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { saveTemplateAction, type TemplateState } from "./actions"

type Template = {
  id: string
  name: string
  channel: string
  subject_template: string | null
  body_template: string
  is_active: boolean
}

export function TemplatesEditor({ templates }: { templates: Template[] }) {
  return (
    <div className="space-y-6">
      {templates.map((t) => (
        <TemplateForm key={t.id} template={t} />
      ))}
    </div>
  )
}

function TemplateForm({ template }: { template: Template }) {
  const [state, action, pending] = useActionState<TemplateState, FormData>(
    saveTemplateAction,
    null,
  )
  return (
    <form action={action} className="space-y-3 rounded-lg border bg-card p-4">
      <input type="hidden" name="id" value={template.id} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${template.id}`}>Nombre</Label>
          <Input
            id={`name-${template.id}`}
            name="name"
            defaultValue={template.name}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`channel-${template.id}`}>Canal</Label>
          <Select name="channel" defaultValue={template.channel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="inapp">In-app</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`subj-${template.id}`}>Asunto (sólo email)</Label>
        <Input
          id={`subj-${template.id}`}
          name="subject_template"
          defaultValue={template.subject_template ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`body-${template.id}`}>Cuerpo</Label>
        <Textarea
          id={`body-${template.id}`}
          name="body_template"
          defaultValue={template.body_template}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Variables disponibles:{" "}
          {
            "{{patient_first_name}}, {{appointment_date}}, {{appointment_time}}, {{professional_name}}, {{clinic_name}}"
          }
        </p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar plantilla"}
      </Button>
    </form>
  )
}
