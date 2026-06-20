# Fisio CRM — Fase 8: Recordatorios

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Encolar automáticamente recordatorios (24h y 2h antes) al crear o mover citas, mostrar la cola en el panel, y disponer de un endpoint cron que envía los pendientes vía Resend (opt-in si hay `RESEND_API_KEY`).

**Architecture:** Trigger Postgres encola los recordatorios al INSERT/UPDATE en `appointments`. Endpoint `POST /api/reminders/dispatch` protegido con `CRON_SECRET` procesa lotes. Envío real con Resend si está configurado; si no, sólo marca como sent simulando.

**Tech Stack:** Postgres triggers, Vercel Cron, Resend SDK.

---

## Task 8.1: Reglas puras de scheduling (TDD)

**Files:**
- Create: `lib/domain/reminder-scheduler.ts`
- Create: `lib/domain/reminder-scheduler.test.ts`

- [ ] **Step 1: Tests**

```ts
// lib/domain/reminder-scheduler.test.ts
import { describe, it, expect } from "vitest"
import { computeReminderSchedule } from "./reminder-scheduler"

describe("computeReminderSchedule", () => {
  const startsAt = new Date("2026-06-10T10:00:00Z")
  const now = new Date("2026-06-09T08:00:00Z")

  it("schedules 24h before when far enough in the future", () => {
    const sched = computeReminderSchedule({ startsAt, now })
    const twentyFour = sched.find((s) => s.label === "24h")
    expect(twentyFour?.scheduledAt.toISOString()).toBe("2026-06-09T10:00:00.000Z")
  })

  it("schedules 2h before when far enough", () => {
    const sched = computeReminderSchedule({ startsAt, now })
    const two = sched.find((s) => s.label === "2h")
    expect(two?.scheduledAt.toISOString()).toBe("2026-06-10T08:00:00.000Z")
  })

  it("omits a reminder whose scheduledAt would be in the past", () => {
    const lateNow = new Date("2026-06-10T09:30:00Z")
    const sched = computeReminderSchedule({ startsAt, now: lateNow })
    expect(sched.find((s) => s.label === "24h")).toBeUndefined()
    expect(sched.find((s) => s.label === "2h")).toBeUndefined()
  })

  it("omits reminders for past appointments", () => {
    const sched = computeReminderSchedule({
      startsAt: new Date("2026-06-08T10:00:00Z"),
      now,
    })
    expect(sched).toEqual([])
  })
})
```

- [ ] **Step 2: Ejecutar — falla**

```bash
pnpm test
```

- [ ] **Step 3: Implementar**

```ts
// lib/domain/reminder-scheduler.ts
export type ReminderSlot = { label: "24h" | "2h"; scheduledAt: Date }

const OFFSETS_MINUTES: Record<ReminderSlot["label"], number> = {
  "24h": 24 * 60,
  "2h": 2 * 60,
}

export function computeReminderSchedule({
  startsAt, now,
}: { startsAt: Date; now: Date }): ReminderSlot[] {
  if (startsAt.getTime() <= now.getTime()) return []
  const out: ReminderSlot[] = []
  for (const [label, minutes] of Object.entries(OFFSETS_MINUTES) as [ReminderSlot["label"], number][]) {
    const at = new Date(startsAt.getTime() - minutes * 60_000)
    if (at.getTime() > now.getTime()) out.push({ label, scheduledAt: at })
  }
  return out
}
```

- [ ] **Step 4: Tests verdes — commit**

```bash
pnpm test
git add -A
git commit -m "feat(domain): reminder scheduler"
```

---

## Task 8.2: Trigger Postgres para encolar recordatorios

**Files:**
- Create: `supabase/migrations/0012_reminders_trigger.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/0012_reminders_trigger.sql

create or replace function public.enqueue_appointment_reminders()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_template uuid;
  v_24h timestamptz;
  v_2h timestamptz;
  v_patient_email text;
begin
  -- Cancelar recordatorios anteriores si la cita cambia de tiempo o se cancela
  if tg_op = 'UPDATE' then
    if (old.starts_at <> new.starts_at)
       or (old.status in ('cancelled','no_show') and new.status not in ('cancelled','no_show'))
       or (new.status in ('cancelled','no_show')) then
      update appointment_reminders
        set status = 'cancelled'
        where appointment_id = new.id and status = 'pending';
    end if;
    if new.status in ('cancelled','no_show') then
      return new;
    end if;
  end if;

  -- Si el paciente no tiene consentimiento de comunicaciones activo, no encolar
  if not exists (
    select 1 from patient_consents pc
      join clinic_consents cc on cc.id = pc.consent_id
      where pc.patient_id = new.patient_id
        and pc.granted = true
        and pc.withdrawn_at is null
        and cc.kind = 'comunicaciones'
        and cc.is_current = true
  ) then
    return new;
  end if;

  v_24h := new.starts_at - interval '24 hours';
  v_2h := new.starts_at - interval '2 hours';

  -- Encolar 24h si está en el futuro y no existe ya
  if v_24h > now() then
    select id into v_template from reminder_templates
      where clinic_id = new.clinic_id and name = 'Recordatorio 24h' and is_active = true limit 1;
    insert into appointment_reminders(clinic_id, appointment_id, template_id, channel, scheduled_at)
    select new.clinic_id, new.id, v_template, 'email', v_24h
    where not exists (
      select 1 from appointment_reminders
        where appointment_id = new.id and scheduled_at = v_24h and channel = 'email' and status = 'pending'
    );
  end if;

  -- Encolar 2h
  if v_2h > now() then
    insert into appointment_reminders(clinic_id, appointment_id, template_id, channel, scheduled_at)
    select new.clinic_id, new.id, null, 'email', v_2h
    where not exists (
      select 1 from appointment_reminders
        where appointment_id = new.id and scheduled_at = v_2h and channel = 'email' and status = 'pending'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_reminders_ins on appointments;
create trigger trg_enqueue_reminders_ins
  after insert on appointments
  for each row execute function enqueue_appointment_reminders();

drop trigger if exists trg_enqueue_reminders_upd on appointments;
create trigger trg_enqueue_reminders_upd
  after update of starts_at, status on appointments
  for each row execute function enqueue_appointment_reminders();
```

- [ ] **Step 2: Aplicar y commitear**

```bash
pnpm dlx supabase db push
pnpm db:types
git add -A
git commit -m "feat(db): trigger to enqueue appointment reminders"
```

---

## Task 8.3: UI de recordatorios

**Files:**
- Modify: `app/(panel)/panel/recordatorios/page.tsx`
- Create: `app/(panel)/panel/recordatorios/RemindersList.tsx`
- Create: `app/(panel)/panel/recordatorios/TemplatesEditor.tsx`
- Create: `app/(panel)/panel/recordatorios/actions.ts`
- Create: `lib/db/reminders.ts`

- [ ] **Step 1: `lib/db/reminders.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function listPendingReminders(clinicId: string, limit = 100) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("appointment_reminders")
    .select(`
      id, channel, scheduled_at, status, sent_at, error_message,
      appointments(starts_at, patients(first_name, last_name), professionals(display_name))
    `)
    .eq("clinic_id", clinicId)
    .order("scheduled_at", { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function listTemplates(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("reminder_templates")
    .select("id, name, channel, subject_template, body_template, is_active")
    .eq("clinic_id", clinicId)
  if (error) throw error
  return data ?? []
}

export async function upsertTemplate(input: {
  id?: string
  clinic_id: string
  name: string
  channel: "email" | "inapp"
  subject_template?: string | null
  body_template: string
  is_active?: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("reminder_templates").upsert(input)
  if (error) throw error
}
```

- [ ] **Step 2: Actions**

```ts
// app/(panel)/panel/recordatorios/actions.ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { upsertTemplate } from "@/lib/db/reminders"

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(1),
  channel: z.enum(["email", "inapp"]),
  subject_template: z.string().optional().or(z.literal("")),
  body_template: z.string().min(1),
  is_active: z.coerce.boolean().optional(),
})

export type TemplateState = { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean } | null

export async function saveTemplateAction(_prev: TemplateState, formData: FormData): Promise<TemplateState> {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    await upsertTemplate({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      name: parsed.data.name,
      channel: parsed.data.channel,
      subject_template: parsed.data.subject_template || null,
      body_template: parsed.data.body_template,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath("/panel/recordatorios")
  return { ok: true }
}
```

- [ ] **Step 3: Página**

```tsx
// app/(panel)/panel/recordatorios/page.tsx
import { PageHeader } from "@/components/panel/PageHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listPendingReminders, listTemplates } from "@/lib/db/reminders"
import { RemindersList } from "./RemindersList"
import { TemplatesEditor } from "./TemplatesEditor"

export default async function RecordatoriosPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const [pending, templates] = await Promise.all([
    listPendingReminders(active.clinic_id),
    listTemplates(active.clinic_id),
  ])
  return (
    <>
      <PageHeader title="Recordatorios" description="Cola y plantillas de mensajes." />
      <div className="p-6">
        <Tabs defaultValue="cola">
          <TabsList>
            <TabsTrigger value="cola">Cola</TabsTrigger>
            <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
          </TabsList>
          <TabsContent value="cola" className="pt-4"><RemindersList rows={pending} /></TabsContent>
          <TabsContent value="plantillas" className="pt-4"><TemplatesEditor templates={templates} /></TabsContent>
        </Tabs>
      </div>
    </>
  )
}
```

- [ ] **Step 4: `RemindersList.tsx`**

```tsx
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"

type Row = {
  id: string; channel: string; scheduled_at: string; status: string
  sent_at: string | null; error_message: string | null
  appointments: {
    starts_at: string
    patients: { first_name: string; last_name: string } | null
    professionals: { display_name: string } | null
  } | null
}

const statusColor: Record<string, "secondary" | "outline" | "destructive"> = {
  pending: "outline", sent: "secondary", failed: "destructive", cancelled: "outline",
}

export function RemindersList({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin recordatorios en cola" }}
      columns={[
        { key: "when", header: "Programado",
          render: (r) => new Date(r.scheduled_at).toLocaleString("es-ES") },
        { key: "appt", header: "Cita",
          render: (r) => r.appointments ?
            `${new Date(r.appointments.starts_at).toLocaleString("es-ES")} · ${r.appointments.patients?.first_name ?? ""} ${r.appointments.patients?.last_name ?? ""}`
            : "—" },
        { key: "fisio", header: "Fisio",
          render: (r) => r.appointments?.professionals?.display_name ?? "—" },
        { key: "channel", header: "Canal", render: (r) => r.channel },
        { key: "status", header: "Estado",
          render: (r) => <Badge variant={statusColor[r.status] ?? "outline"}>{r.status}</Badge> },
        { key: "error", header: "Error",
          render: (r) => r.error_message ?? (r.sent_at ? new Date(r.sent_at).toLocaleString("es-ES") : "—") },
      ]}
    />
  )
}
```

- [ ] **Step 5: `TemplatesEditor.tsx`**

```tsx
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveTemplateAction, type TemplateState } from "./actions"

type Template = {
  id: string; name: string; channel: string
  subject_template: string | null; body_template: string; is_active: boolean
}

export function TemplatesEditor({ templates }: { templates: Template[] }) {
  return (
    <div className="space-y-6">
      {templates.map((t) => <TemplateForm key={t.id} template={t} />)}
    </div>
  )
}

function TemplateForm({ template }: { template: Template }) {
  const [state, action, pending] = useActionState<TemplateState, FormData>(saveTemplateAction, null)
  return (
    <form action={action} className="space-y-3 rounded-lg border bg-card p-4">
      <input type="hidden" name="id" value={template.id} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${template.id}`}>Nombre</Label>
          <Input id={`name-${template.id}`} name="name" defaultValue={template.name} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`channel-${template.id}`}>Canal</Label>
          <Select name="channel" defaultValue={template.channel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="inapp">In-app</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`subj-${template.id}`}>Asunto (sólo email)</Label>
        <Input id={`subj-${template.id}`} name="subject_template" defaultValue={template.subject_template ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`body-${template.id}`}>Cuerpo</Label>
        <Textarea id={`body-${template.id}`} name="body_template" defaultValue={template.body_template} rows={4} />
        <p className="text-xs text-muted-foreground">
          Variables disponibles: {"{{patient_first_name}}, {{appointment_date}}, {{appointment_time}}, {{professional_name}}, {{clinic_name}}"}
        </p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Guardado.</p>}
      <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar plantilla"}</Button>
    </form>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(panel): reminders queue and templates editor"
```

---

## Task 8.4: Endpoint de dispatch

**Files:**
- Create: `app/api/reminders/dispatch/route.ts`
- Create: `lib/reminders/dispatcher.ts`
- Create: `lib/reminders/render-template.ts`
- Create: `lib/reminders/render-template.test.ts`

- [ ] **Step 1: Template rendering (TDD)**

```ts
// lib/reminders/render-template.test.ts
import { describe, it, expect } from "vitest"
import { renderTemplate } from "./render-template"

describe("renderTemplate", () => {
  it("replaces simple placeholders", () => {
    expect(renderTemplate("Hola {{name}}", { name: "Ana" })).toBe("Hola Ana")
  })
  it("leaves missing placeholders as empty string", () => {
    expect(renderTemplate("Hola {{name}}", {})).toBe("Hola ")
  })
  it("ignores unknown keys without throwing", () => {
    expect(renderTemplate("Hola {{x}}", { name: "Ana" })).toBe("Hola ")
  })
})
```

- [ ] **Step 2: Implementación**

```ts
// lib/reminders/render-template.ts
export function renderTemplate(tpl: string, vars: Record<string, string | number | undefined | null>): string {
  return tpl.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, k) => {
    const v = vars[k]
    return v == null ? "" : String(v)
  })
}
```

```bash
pnpm test
git add -A
git commit -m "feat(reminders): render-template helper"
```

- [ ] **Step 3: Dispatcher**

```ts
// lib/reminders/dispatcher.ts
import { createSupabaseServiceClient } from "@/lib/supabase/service"
import { renderTemplate } from "./render-template"
import { env } from "@/lib/env"

type RowToSend = {
  id: string
  channel: "email" | "inapp"
  template_id: string | null
  appointment_id: string
  clinic_id: string
}

export async function dispatchPendingReminders(limit = 100): Promise<{ processed: number; sent: number; failed: number }> {
  const sb = createSupabaseServiceClient()

  // Selecciona pendientes vencidos
  const { data: pending, error } = await sb
    .from("appointment_reminders")
    .select("id, channel, template_id, appointment_id, clinic_id")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(limit)
  if (error) throw error
  if (!pending || pending.length === 0) return { processed: 0, sent: 0, failed: 0 }

  let sent = 0, failed = 0
  for (const r of pending as RowToSend[]) {
    const ok = await sendOne(sb, r).catch(async (e) => {
      await sb.from("appointment_reminders").update({
        status: "failed", error_message: e instanceof Error ? e.message : String(e),
      }).eq("id", r.id)
      return false
    })
    if (ok === true) sent++; else failed++
  }
  return { processed: pending.length, sent, failed }
}

async function sendOne(sb: ReturnType<typeof createSupabaseServiceClient>, r: RowToSend): Promise<boolean> {
  const { data: appt } = await sb
    .from("appointments")
    .select(`
      id, starts_at,
      patients(first_name, last_name, email),
      professionals(display_name),
      clinics(name)
    `)
    .eq("id", r.appointment_id)
    .single()
  if (!appt) throw new Error("appointment not found")

  let subject = "Recordatorio de cita"
  let body = "Te recordamos tu cita."
  if (r.template_id) {
    const { data: tpl } = await sb
      .from("reminder_templates")
      .select("subject_template, body_template")
      .eq("id", r.template_id)
      .single()
    if (tpl) {
      const dt = new Date(appt.starts_at)
      const vars = {
        patient_first_name: appt.patients?.first_name ?? "",
        appointment_date: dt.toLocaleDateString("es-ES"),
        appointment_time: dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        professional_name: appt.professionals?.display_name ?? "",
        clinic_name: appt.clinics?.name ?? "",
      }
      if (tpl.subject_template) subject = renderTemplate(tpl.subject_template, vars)
      body = renderTemplate(tpl.body_template, vars)
    }
  }

  const recipient = appt.patients?.email
  if (!recipient) {
    await sb.from("appointment_reminders").update({
      status: "failed", error_message: "Sin email del paciente",
    }).eq("id", r.id)
    return false
  }

  let providerMessageId: string | null = null
  if (r.channel === "email" && env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [recipient],
        subject,
        text: body,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`resend ${res.status}: ${errText}`)
    }
    const json = await res.json().catch(() => ({})) as { id?: string }
    providerMessageId = json.id ?? null
  } else {
    // Modo simulado (sin Resend) — no envía pero registra.
  }

  await sb.from("appointment_reminders").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    provider_message_id: providerMessageId,
    payload_snapshot: { subject, body, to: recipient },
  }).eq("id", r.id)
  return true
}
```

- [ ] **Step 4: Endpoint**

```ts
// app/api/reminders/dispatch/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { dispatchPendingReminders } from "@/lib/reminders/dispatcher"
import { env } from "@/lib/env"

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const result = await dispatchPendingReminders()
  return NextResponse.json(result)
}

export const dynamic = "force-dynamic"
```

- [ ] **Step 5: Vercel cron config**

Crear `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/reminders/dispatch",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Vercel cron usa GET por defecto; nuestra ruta es POST. Convertimos a GET aceptando ambos:

Actualizar `app/api/reminders/dispatch/route.ts` añadiendo:

```ts
export async function GET(req: NextRequest) {
  return POST(req)
}
```

- [ ] **Step 6: Prueba manual**

Crear una cita con paciente que tenga consentimiento de comunicaciones. Comprobar que aparece en `appointment_reminders` con status `pending`. Llamar al endpoint:

```bash
curl -X POST http://localhost:3000/api/reminders/dispatch \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

Si no hay `RESEND_API_KEY`, el recordatorio queda como `sent` con `payload_snapshot` (modo simulado). Si está configurado, se envía email real.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(reminders): dispatcher endpoint with Resend support (opt-in)"
```

---

## Self-check de la fase

```bash
pnpm typecheck && pnpm test && pnpm build
```

Manual:
- Al crear/mover una cita se ven nuevos recordatorios `pending` en `/panel/recordatorios`.
- Cancelar la cita los marca como `cancelled`.
- Editar una plantilla persiste.
- Llamar al endpoint procesa pendientes.

## Siguiente fase

`2026-06-09-fisio-crm-09-rgpd-deploy.md` — Audit log activo, anonimización completa, README y deploy en Vercel.
