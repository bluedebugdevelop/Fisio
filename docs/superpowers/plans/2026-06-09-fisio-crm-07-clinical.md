# Fisio CRM — Fase 7: Historia clínica, notas de sesión y documentos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Permitir al fisio/admin completar la historia clínica del paciente, escribir notas SOAP por sesión vinculadas a las citas, y subir documentos al bucket privado.

**Architecture:** Tablas y RLS ya existen (Fase 1). DB layer + acciones por entidad. Editor SOAP simple con textarea (no rich text en MVP). Uploads via supabase-js desde el cliente con signed URL para download.

**Tech Stack:** shadcn, zod, supabase storage SDK.

---

## Task 7.1: Capa de datos

**Files:**
- Create: `lib/db/clinical-records.ts`
- Create: `lib/db/session-notes.ts`
- Create: `lib/db/documents.ts`

- [ ] **Step 1: `lib/db/clinical-records.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

type Upsert = Database["public"]["Tables"]["clinical_records"]["Insert"]

export async function getOrInitClinicalRecord(patientId: string, clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinical_records")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle()
  if (error) throw error
  if (data) return data
  const { data: created, error: e2 } = await supabase
    .from("clinical_records")
    .insert({ patient_id: patientId, clinic_id: clinicId })
    .select("*")
    .single()
  if (e2) throw e2
  return created
}

export async function updateClinicalRecord(id: string, input: Partial<Upsert> & { updated_by: string }) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("clinical_records").update(input).eq("id", id)
  if (error) throw error
}
```

- [ ] **Step 2: `lib/db/session-notes.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function listSessionNotes(patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("session_notes")
    .select(`
      id, appointment_id, subjective, objective, assessment, plan,
      techniques, home_program, pain_pre, pain_post, created_at, author_id,
      appointments(starts_at, professional_id, professionals(display_name, color))
    `)
    .eq("clinical_record_id", (await getRecordId(patientId)))
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

async function getRecordId(patientId: string): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinical_records")
    .select("id")
    .eq("patient_id", patientId)
    .single()
  if (error) throw error
  return data.id
}

export async function getSessionNoteByAppointment(appointmentId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("session_notes")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertSessionNote(input: {
  id?: string
  clinic_id: string
  appointment_id: string
  clinical_record_id: string
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  techniques?: string[]
  home_program?: string | null
  pain_pre?: number | null
  pain_post?: number | null
  author_id: string
}) {
  const supabase = await createSupabaseServerClient()
  const payload = { ...input, techniques: input.techniques ?? [] }
  const { error } = await supabase.from("session_notes").upsert(payload, { onConflict: "appointment_id" })
  if (error) throw error
}
```

- [ ] **Step 3: `lib/db/documents.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function listDocuments(patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("documents")
    .select("id, kind, filename, mime, size_bytes, storage_path, notes, uploaded_at, uploaded_by")
    .eq("patient_id", patientId)
    .order("uploaded_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function insertDocumentRow(input: {
  clinic_id: string
  patient_id: string
  kind: "informe" | "prueba_imagen" | "consentimiento" | "receta" | "otro"
  filename: string
  mime: string
  size_bytes: number
  storage_path: string
  uploaded_by: string
  notes?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("documents").insert(input)
  if (error) throw error
}

export async function deleteDocument(id: string, storagePath: string) {
  const supabase = await createSupabaseServerClient()
  await supabase.storage.from("patient-documents").remove([storagePath])
  const { error } = await supabase.from("documents").delete().eq("id", id)
  if (error) throw error
}

export async function createDocumentSignedUrl(storagePath: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from("patient-documents")
    .createSignedUrl(storagePath, 60)
  if (error) throw error
  return data.signedUrl
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(db): clinical_records, session_notes and documents"
```

---

## Task 7.2: Historia clínica del paciente

**Files:**
- Create: `app/(panel)/panel/pacientes/[id]/historia/page.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/historia/ClinicalRecordForm.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/historia/actions.ts`

- [ ] **Step 1: Actions**

```ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { updateClinicalRecord } from "@/lib/db/clinical-records"

const schema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  chief_complaint: z.string().optional().or(z.literal("")),
  diagnosis: z.string().optional().or(z.literal("")),
  medical_history: z.string().optional().or(z.literal("")),
  current_medication: z.string().optional().or(z.literal("")),
  allergies: z.string().optional().or(z.literal("")),
  red_flags: z.string().optional().or(z.literal("")),
  objectives: z.string().optional().or(z.literal("")),
})

export type RecordState = { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean } | null

export async function saveClinicalRecordAction(_prev: RecordState, formData: FormData): Promise<RecordState> {
  const { user, active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const data = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]))
  try {
    await updateClinicalRecord(parsed.data.id, {
      chief_complaint: data.chief_complaint as string | null,
      diagnosis: data.diagnosis as string | null,
      medical_history: data.medical_history as string | null,
      current_medication: data.current_medication as string | null,
      allergies: data.allergies as string | null,
      red_flags: data.red_flags as string | null,
      objectives: data.objectives as string | null,
      updated_by: user.id,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath(`/panel/pacientes/${parsed.data.patient_id}/historia`)
  return { ok: true }
}
```

- [ ] **Step 2: `page.tsx`**

```tsx
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { getOrInitClinicalRecord } from "@/lib/db/clinical-records"
import { ClinicalRecordForm } from "./ClinicalRecordForm"

export default async function HistoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const record = await getOrInitClinicalRecord(id, active.clinic_id)
  return (
    <>
      <PageHeader title="Historia clínica" description="Información clínica permanente del paciente." />
      <div className="p-6 max-w-3xl"><ClinicalRecordForm initial={record} patientId={id} /></div>
    </>
  )
}
```

- [ ] **Step 3: `ClinicalRecordForm.tsx`**

```tsx
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveClinicalRecordAction, type RecordState } from "./actions"

type Initial = {
  id: string
  chief_complaint: string | null
  diagnosis: string | null
  medical_history: string | null
  current_medication: string | null
  allergies: string | null
  red_flags: string | null
  objectives: string | null
}

export function ClinicalRecordForm({ initial, patientId }: { initial: Initial; patientId: string }) {
  const [state, action, pending] = useActionState<RecordState, FormData>(saveClinicalRecordAction, null)
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={initial.id} />
      <input type="hidden" name="patient_id" value={patientId} />
      <Section name="chief_complaint" label="Motivo de consulta" initial={initial.chief_complaint ?? ""} />
      <Section name="diagnosis" label="Diagnóstico" initial={initial.diagnosis ?? ""} />
      <Section name="medical_history" label="Antecedentes médicos" initial={initial.medical_history ?? ""} />
      <Section name="current_medication" label="Medicación actual" initial={initial.current_medication ?? ""} />
      <Section name="allergies" label="Alergias" initial={initial.allergies ?? ""} />
      <Section name="red_flags" label="Banderas rojas / contraindicaciones" initial={initial.red_flags ?? ""} />
      <Section name="objectives" label="Objetivos del tratamiento" initial={initial.objectives ?? ""} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Guardado.</p>}
      <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
    </form>
  )
}

function Section({ name, label, initial }: { name: string; label: string; initial: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={initial} rows={3} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(panel): clinical record editor"
```

---

## Task 7.3: Notas de sesión (SOAP) por cita

**Files:**
- Create: `app/(panel)/panel/pacientes/[id]/sesiones/page.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/sesiones/SessionsList.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/sesiones/[appointmentId]/page.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/sesiones/[appointmentId]/SessionNoteForm.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/sesiones/actions.ts`
- Create: `lib/domain/session-rules.ts`
- Create: `lib/domain/session-rules.test.ts`

- [ ] **Step 1: Tests de reglas de sesión (TDD)**

```ts
// lib/domain/session-rules.test.ts
import { describe, it, expect } from "vitest"
import { canWriteSessionNote, type AppointmentStatus } from "./session-rules"

describe("canWriteSessionNote", () => {
  const allowed: AppointmentStatus[] = ["checked_in", "completed"]
  const forbidden: AppointmentStatus[] = ["scheduled", "confirmed", "no_show", "cancelled"]

  it.each(allowed)("permits writing for status %s", (s) => {
    expect(canWriteSessionNote(s, true)).toBe(true)
  })

  it.each(forbidden)("forbids writing for status %s", (s) => {
    expect(canWriteSessionNote(s, true)).toBe(false)
  })

  it("requires treatment consent", () => {
    expect(canWriteSessionNote("completed", false)).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar — debe fallar**

```bash
pnpm test
```

- [ ] **Step 3: Implementar**

```ts
// lib/domain/session-rules.ts
export type AppointmentStatus =
  | "scheduled" | "confirmed" | "checked_in" | "completed" | "no_show" | "cancelled"

export function canWriteSessionNote(
  appointmentStatus: AppointmentStatus,
  hasTreatmentConsent: boolean,
): boolean {
  if (!hasTreatmentConsent) return false
  return appointmentStatus === "checked_in" || appointmentStatus === "completed"
}
```

- [ ] **Step 4: Tests verdes — commit**

```bash
pnpm test
git add -A
git commit -m "feat(domain): rules for writing session notes"
```

- [ ] **Step 5: Action de upsert de nota**

```ts
// app/(panel)/panel/pacientes/[id]/sesiones/actions.ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { getAppointment } from "@/lib/db/appointments"
import { getOrInitClinicalRecord } from "@/lib/db/clinical-records"
import { upsertSessionNote } from "@/lib/db/session-notes"
import { hasGrantedTreatmentConsent } from "@/lib/db/consents"
import { canWriteSessionNote } from "@/lib/domain/session-rules"

const schema = z.object({
  appointment_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  id: z.string().uuid().optional().or(z.literal("")),
  subjective: z.string().optional().or(z.literal("")),
  objective: z.string().optional().or(z.literal("")),
  assessment: z.string().optional().or(z.literal("")),
  plan: z.string().optional().or(z.literal("")),
  techniques: z.string().optional().or(z.literal("")),
  home_program: z.string().optional().or(z.literal("")),
  pain_pre: z.coerce.number().int().min(0).max(10).optional(),
  pain_post: z.coerce.number().int().min(0).max(10).optional(),
})

export type SessionNoteState = { error?: string; ok?: boolean } | null

export async function saveSessionNoteAction(_prev: SessionNoteState, formData: FormData): Promise<SessionNoteState> {
  const { user, active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Datos no válidos" }
  const app = await getAppointment(parsed.data.appointment_id)
  const consent = await hasGrantedTreatmentConsent(parsed.data.patient_id)
  if (!canWriteSessionNote(app.status, consent)) {
    return { error: "No se puede registrar la nota: estado de cita o consentimiento incompatibles." }
  }
  const record = await getOrInitClinicalRecord(parsed.data.patient_id, active.clinic_id)
  try {
    await upsertSessionNote({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      appointment_id: parsed.data.appointment_id,
      clinical_record_id: record.id,
      subjective: parsed.data.subjective || null,
      objective: parsed.data.objective || null,
      assessment: parsed.data.assessment || null,
      plan: parsed.data.plan || null,
      techniques: parsed.data.techniques
        ? parsed.data.techniques.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      home_program: parsed.data.home_program || null,
      pain_pre: parsed.data.pain_pre ?? null,
      pain_post: parsed.data.pain_post ?? null,
      author_id: user.id,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath(`/panel/pacientes/${parsed.data.patient_id}/sesiones`)
  return { ok: true }
}
```

- [ ] **Step 6: `sesiones/page.tsx` (lista)**

```tsx
import Link from "next/link"
import { PageHeader } from "@/components/panel/PageHeader"
import { Badge } from "@/components/ui/badge"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listSessionNotes } from "@/lib/db/session-notes"

export default async function SessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const notes = await listSessionNotes(id)
  return (
    <>
      <PageHeader title="Sesiones" description="Notas SOAP por cita." />
      <div className="p-6 space-y-3">
        {notes.length === 0 && <p className="text-sm text-muted-foreground">Sin notas de sesión.</p>}
        {notes.map((n) => (
          <Link key={n.id} href={`/panel/pacientes/${id}/sesiones/${n.appointment_id}`}
                className="block rounded-lg border bg-card p-4 hover:bg-muted">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {new Date(n.appointments?.starts_at ?? n.created_at).toLocaleString("es-ES")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {n.appointments?.professionals?.display_name ?? "Profesional"}
                </div>
              </div>
              {n.pain_pre != null && n.pain_post != null && (
                <Badge variant="outline">EVA {n.pain_pre} → {n.pain_post}</Badge>
              )}
            </div>
            {n.assessment && <p className="mt-2 line-clamp-2 text-sm">{n.assessment}</p>}
          </Link>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 7: `sesiones/[appointmentId]/page.tsx` (editor)**

```tsx
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { getAppointment } from "@/lib/db/appointments"
import { getSessionNoteByAppointment } from "@/lib/db/session-notes"
import { hasGrantedTreatmentConsent } from "@/lib/db/consents"
import { canWriteSessionNote } from "@/lib/domain/session-rules"
import { SessionNoteForm } from "./SessionNoteForm"

export default async function SessionNotePage({
  params,
}: { params: Promise<{ id: string; appointmentId: string }> }) {
  const { id, appointmentId } = await params
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])

  let app
  try { app = await getAppointment(appointmentId) } catch { notFound() }
  if (app.patient_id !== id || app.clinic_id !== active.clinic_id) notFound()

  const existing = await getSessionNoteByAppointment(appointmentId)
  const consent = await hasGrantedTreatmentConsent(id)
  const allowed = canWriteSessionNote(app.status, consent)

  return (
    <>
      <PageHeader
        title="Nota de sesión"
        description={`${new Date(app.starts_at).toLocaleString("es-ES")} con ${app.professionals?.display_name ?? ""}`}
      />
      <div className="p-6 max-w-3xl">
        {!allowed && (
          <div className="mb-4 rounded-md border-l-4 border-warning bg-warning/10 p-3 text-sm">
            No puedes editar esta nota: necesitas consentimiento de tratamiento y que la cita esté en estado "llegó" o "realizada".
          </div>
        )}
        <SessionNoteForm
          patientId={id}
          appointmentId={appointmentId}
          initial={existing}
          disabled={!allowed}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 8: `SessionNoteForm.tsx`**

```tsx
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveSessionNoteAction, type SessionNoteState } from "../actions"

type Initial = {
  id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  techniques: string[]
  home_program: string | null
  pain_pre: number | null
  pain_post: number | null
} | null

export function SessionNoteForm({
  patientId, appointmentId, initial, disabled,
}: {
  patientId: string
  appointmentId: string
  initial: Initial
  disabled: boolean
}) {
  const [state, action, pending] = useActionState<SessionNoteState, FormData>(saveSessionNoteAction, null)
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="appointment_id" value={appointmentId} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field name="subjective" label="S — Subjetivo" defaultValue={initial?.subjective ?? ""} disabled={disabled} />
      <Field name="objective" label="O — Objetivo" defaultValue={initial?.objective ?? ""} disabled={disabled} />
      <Field name="assessment" label="A — Valoración" defaultValue={initial?.assessment ?? ""} disabled={disabled} />
      <Field name="plan" label="P — Plan" defaultValue={initial?.plan ?? ""} disabled={disabled} />
      <div className="space-y-1.5">
        <Label htmlFor="techniques">Técnicas aplicadas (separadas por coma)</Label>
        <Input id="techniques" name="techniques"
               defaultValue={(initial?.techniques ?? []).join(", ")} disabled={disabled} />
      </div>
      <Field name="home_program" label="Pauta para casa" defaultValue={initial?.home_program ?? ""} disabled={disabled} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pain_pre">EVA antes (0-10)</Label>
          <Input id="pain_pre" name="pain_pre" type="number" min={0} max={10}
                 defaultValue={initial?.pain_pre ?? ""} disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pain_post">EVA después (0-10)</Label>
          <Input id="pain_post" name="pain_post" type="number" min={0} max={10}
                 defaultValue={initial?.pain_post ?? ""} disabled={disabled} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Nota guardada.</p>}
      <Button type="submit" disabled={pending || disabled}>{pending ? "Guardando..." : "Guardar nota"}</Button>
    </form>
  )
}

function Field({ name, label, defaultValue, disabled }: { name: string; label: string; defaultValue: string; disabled: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={defaultValue} rows={3} disabled={disabled} />
    </div>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(panel): session notes editor with consent + status gating"
```

---

## Task 7.4: Documentos (upload + descarga firmada + borrar)

**Files:**
- Create: `app/(panel)/panel/pacientes/[id]/documentos/page.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/documentos/DocumentsList.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/documentos/DocumentUploader.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/documentos/actions.ts`

- [ ] **Step 1: Actions (server)**

```ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import {
  insertDocumentRow, createDocumentSignedUrl, deleteDocument,
} from "@/lib/db/documents"

const insertSchema = z.object({
  patient_id: z.string().uuid(),
  kind: z.enum(["informe", "prueba_imagen", "consentimiento", "receta", "otro"]),
  filename: z.string().min(1),
  mime: z.string().min(1),
  size_bytes: z.coerce.number().int().min(1),
  storage_path: z.string().min(1),
  notes: z.string().optional().or(z.literal("")),
})

export async function registerDocumentAction(formData: FormData) {
  const { user, active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const parsed = insertSchema.parse(Object.fromEntries(formData))
  await insertDocumentRow({
    clinic_id: active.clinic_id,
    patient_id: parsed.patient_id,
    kind: parsed.kind,
    filename: parsed.filename,
    mime: parsed.mime,
    size_bytes: parsed.size_bytes,
    storage_path: parsed.storage_path,
    uploaded_by: user.id,
    notes: parsed.notes || null,
  })
  revalidatePath(`/panel/pacientes/${parsed.patient_id}/documentos`)
}

export async function getDownloadUrlAction(storagePath: string): Promise<string> {
  await requireActiveClinic()
  return createDocumentSignedUrl(storagePath)
}

export async function deleteDocumentAction(id: string, storagePath: string, patientId: string) {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  await deleteDocument(id, storagePath)
  revalidatePath(`/panel/pacientes/${patientId}/documentos`)
}
```

- [ ] **Step 2: `page.tsx`**

```tsx
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listDocuments } from "@/lib/db/documents"
import { DocumentsList } from "./DocumentsList"
import { DocumentUploader } from "./DocumentUploader"

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const docs = await listDocuments(id)
  return (
    <>
      <PageHeader
        title="Documentos"
        description="Informes, pruebas y otros archivos."
        actions={<DocumentUploader patientId={id} clinicId={active.clinic_id} />}
      />
      <div className="p-6"><DocumentsList rows={docs} patientId={id} /></div>
    </>
  )
}
```

- [ ] **Step 3: `DocumentUploader.tsx` (client)**

```tsx
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
```

- [ ] **Step 4: `DocumentsList.tsx`**

```tsx
"use client"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"
import { getDownloadUrlAction, deleteDocumentAction } from "./actions"

type Row = {
  id: string; kind: string; filename: string; mime: string
  size_bytes: number; storage_path: string; notes: string | null; uploaded_at: string
}

export function DocumentsList({ rows, patientId }: { rows: Row[]; patientId: string }) {
  const [pending, start] = useTransition()
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin documentos", description: "Sube el primer informe del paciente." }}
      columns={[
        { key: "kind", header: "Tipo", render: (r) => <Badge variant="outline">{r.kind}</Badge> },
        { key: "filename", header: "Archivo", render: (r) => r.filename },
        { key: "size", header: "Tamaño",
          render: (r) => `${(r.size_bytes / 1024 / 1024).toFixed(2)} MB` },
        { key: "date", header: "Subido",
          render: (r) => new Date(r.uploaded_at).toLocaleString("es-ES") },
        { key: "actions", header: "", className: "text-right w-44",
          render: (r) => (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost" size="sm" disabled={pending}
                onClick={() => start(async () => {
                  const url = await getDownloadUrlAction(r.storage_path)
                  window.open(url, "_blank", "noopener,noreferrer")
                })}
              >Descargar</Button>
              <Button
                variant="ghost" size="sm" disabled={pending}
                onClick={() => start(() => deleteDocumentAction(r.id, r.storage_path, patientId))}
              >Borrar</Button>
            </div>
          ) },
      ]}
    />
  )
}
```

- [ ] **Step 5: Verificación manual**

```bash
pnpm dev
```

1. Subir un PDF como "informe" → aparece en la lista.
2. Descargar → abre signed URL en pestaña nueva.
3. Borrar → desaparece y el archivo se elimina del bucket (verificar en Supabase Storage UI).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(panel): patient documents (upload, signed download, delete)"
```

---

## Self-check de la fase

```bash
pnpm typecheck && pnpm test && pnpm build
```

Manual:
- Historia clínica se persiste y reaparece al recargar.
- Nota de sesión sólo es editable con consentimiento de tratamiento concedido y cita en estado válido.
- Documentos: upload, descarga firmada y borrado funcionan; el archivo se elimina del bucket.

## Siguiente fase

`2026-06-09-fisio-crm-08-reminders.md` — Plantillas, scheduler automático y endpoint de dispatch.
