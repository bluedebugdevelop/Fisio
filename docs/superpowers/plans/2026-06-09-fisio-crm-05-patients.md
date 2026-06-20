# Fisio CRM — Fase 5: Pacientes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** CRUD completo de pacientes con búsqueda, ficha y registro/retirada de consentimientos versionados.

**Architecture:** Lista server-side con búsqueda paginada. Form con react-hook-form para alta/edición. Consentimientos con check + texto vigente; granted_at + IP captados desde el request en el server.

**Tech Stack:** shadcn, zod, react-hook-form, date-fns.

---

## Task 5.1: Capa de datos de pacientes

**Files:**
- Create: `lib/db/patients.ts`

- [ ] **Step 1: Crear `lib/db/patients.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

export type PatientListRow = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  dni: string | null
  birth_date: string | null
  is_active: boolean
}

export async function listPatients(
  clinicId: string,
  opts: { search?: string; limit?: number; offset?: number } = {},
): Promise<{ rows: PatientListRow[]; total: number }> {
  const supabase = await createSupabaseServerClient()
  const limit = opts.limit ?? 25
  const offset = opts.offset ?? 0
  let q = supabase
    .from("patients")
    .select("id, first_name, last_name, email, phone, dni, birth_date, is_active", { count: "exact" })
    .eq("clinic_id", clinicId)
    .is("deleted_at", null)
    .order("last_name")
    .order("first_name")
    .range(offset, offset + limit - 1)

  if (opts.search && opts.search.trim()) {
    const term = opts.search.trim()
    q = q.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,dni.ilike.%${term}%`,
    )
  }
  const { data, count, error } = await q
  if (error) throw error
  return { rows: (data ?? []) as PatientListRow[], total: count ?? 0 }
}

export type PatientInsert = Omit<
  Database["public"]["Tables"]["patients"]["Insert"],
  "clinic_id" | "id" | "created_at" | "updated_at" | "deleted_at"
>

export async function getPatient(clinicId: string, patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("id", patientId)
    .is("deleted_at", null)
    .single()
  if (error) throw error
  return data
}

export async function createPatient(clinicId: string, input: PatientInsert) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...input, clinic_id: clinicId })
    .select("id")
    .single()
  if (error) throw error
  return data.id
}

export async function updatePatient(clinicId: string, patientId: string, input: PatientInsert) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("patients")
    .update(input)
    .eq("clinic_id", clinicId)
    .eq("id", patientId)
  if (error) throw error
}

export async function anonymizePatient(patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc("anonymize_patient", { p_patient_id: patientId })
  if (error) throw error
}
```

- [ ] **Step 2: Capa de datos de consentimientos**

```ts
// lib/db/consents.ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

type Kind = Database["public"]["Enums"]["consent_kind"]

export async function listCurrentConsents(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinic_consents")
    .select("id, kind, version, title, body_markdown")
    .eq("clinic_id", clinicId)
    .eq("is_current", true)
  if (error) throw error
  return data ?? []
}

export async function listPatientConsents(patientId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patient_consents")
    .select("id, consent_id, granted, granted_at, withdrawn_at, clinic_consents(kind, version, title)")
    .eq("patient_id", patientId)
    .order("granted_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function grantConsent(input: {
  patient_id: string
  clinic_id: string
  consent_id: string
  granted: boolean
  granted_ip: string | null
  granted_user_agent: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("patient_consents").insert(input)
  if (error) throw error
}

export async function hasGrantedTreatmentConsent(patientId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patient_consents")
    .select("id, granted, withdrawn_at, clinic_consents!inner(kind, is_current)")
    .eq("patient_id", patientId)
    .eq("granted", true)
    .is("withdrawn_at", null)
    .eq("clinic_consents.kind", "tratamiento")
    .eq("clinic_consents.is_current", true)
    .limit(1)
  if (error) throw error
  return (data ?? []).length > 0
}

export async function hasGrantedCommunicationsConsent(patientId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("patient_consents")
    .select("id, granted, withdrawn_at, clinic_consents!inner(kind, is_current)")
    .eq("patient_id", patientId)
    .eq("granted", true)
    .is("withdrawn_at", null)
    .eq("clinic_consents.kind", "comunicaciones")
    .eq("clinic_consents.is_current", true)
    .limit(1)
  if (error) throw error
  return (data ?? []).length > 0
}
```

- [ ] **Step 3: Tests del helper `hasGrantedTreatmentConsent` (dominio puro, mock supabase)**

Skip por ahora (testing de capa db requiere mocking de supabase-js — lo cubrimos via E2E manuales en esta fase).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(db): patients and consents queries"
```

---

## Task 5.2: Listado de pacientes con búsqueda

**Files:**
- Modify: `app/(panel)/panel/pacientes/page.tsx`
- Create: `app/(panel)/panel/pacientes/PatientsSearch.tsx`
- Create: `app/(panel)/panel/pacientes/PatientsTable.tsx`

- [ ] **Step 1: `page.tsx`**

```tsx
import Link from "next/link"
import { PageHeader } from "@/components/panel/PageHeader"
import { Button } from "@/components/ui/button"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { listPatients } from "@/lib/db/patients"
import { PatientsSearch } from "./PatientsSearch"
import { PatientsTable } from "./PatientsTable"

const PAGE = 25

export default async function PatientsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { active } = await requireActiveClinic()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? "1"))
  const { rows, total } = await listPatients(active.clinic_id, {
    search: sp.q,
    limit: PAGE,
    offset: (page - 1) * PAGE,
  })
  return (
    <>
      <PageHeader
        title="Pacientes"
        description={`${total} pacientes activos`}
        actions={
          <Button asChild size="sm">
            <Link href="/panel/pacientes/nuevo">Nuevo paciente</Link>
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <PatientsSearch initial={sp.q ?? ""} />
        <PatientsTable rows={rows} />
        {total > PAGE && <Pagination total={total} page={page} q={sp.q} />}
      </div>
    </>
  )
}

function Pagination({ total, page, q }: { total: number; page: number; q?: string }) {
  const pages = Math.ceil(total / PAGE)
  const make = (p: number) => `/panel/pacientes?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Página {page} de {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={make(page - 1)} className="underline">Anterior</Link>}
        {page < pages && <Link href={make(page + 1)} className="underline">Siguiente</Link>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `PatientsSearch.tsx`**

```tsx
"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

export function PatientsSearch({ initial }: { initial: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [value, setValue] = useState(initial)
  const [pending, start] = useTransition()

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString())
      if (value) next.set("q", value); else next.delete("q")
      next.delete("page")
      start(() => router.replace(`/panel/pacientes?${next.toString()}`))
    }, 200)
    return () => clearTimeout(t)
  }, [value, router, sp])

  return (
    <Input
      placeholder="Buscar por nombre, email, DNI o teléfono..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="max-w-sm"
    />
  )
}
```

- [ ] **Step 3: `PatientsTable.tsx`**

```tsx
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"
import type { PatientListRow } from "@/lib/db/patients"

export function PatientsTable({ rows }: { rows: PatientListRow[] }) {
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin pacientes", description: "Da de alta al primer paciente." }}
      columns={[
        { key: "name", header: "Paciente",
          render: (r) => (
            <Link href={`/panel/pacientes/${r.id}`} className="font-medium hover:underline">
              {r.last_name}, {r.first_name}
            </Link>
          ) },
        { key: "dni", header: "DNI", render: (r) => r.dni ?? "—" },
        { key: "phone", header: "Teléfono", render: (r) => r.phone ?? "—" },
        { key: "email", header: "Email", render: (r) => r.email ?? "—" },
        { key: "status", header: "",
          render: (r) => r.is_active ? null : <Badge variant="outline">Inactivo</Badge> },
      ]}
    />
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(panel): patient list with search and pagination"
```

---

## Task 5.3: Alta de paciente

**Files:**
- Create: `app/(panel)/panel/pacientes/nuevo/page.tsx`
- Create: `app/(panel)/panel/pacientes/PatientForm.tsx`
- Create: `app/(panel)/panel/pacientes/actions.ts`

- [ ] **Step 1: Schema y actions compartidas**

```ts
// app/(panel)/panel/pacientes/actions.ts
"use server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { headers } from "next/headers"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { createPatient, updatePatient, anonymizePatient } from "@/lib/db/patients"
import { grantConsent } from "@/lib/db/consents"

const patientSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  first_name: z.string().min(1, "Obligatorio"),
  last_name: z.string().min(1, "Obligatorio"),
  dni: z.string().optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.enum(["f", "m", "x", "none"]).optional(),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  notes_admin: z.string().optional().or(z.literal("")),
  referred_by: z.string().optional().or(z.literal("")),
})

export type PatientState = { error?: string; fieldErrors?: Record<string, string[]> } | null

function cleanInput(d: z.infer<typeof patientSchema>) {
  const e = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === "" ? null : v]))
  delete e.id
  return e as Parameters<typeof createPatient>[1]
}

export async function createPatientAction(_prev: PatientState, formData: FormData): Promise<PatientState> {
  const { active } = await requireActiveClinic()
  const parsed = patientSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    const id = await createPatient(active.clinic_id, cleanInput(parsed.data))
    revalidatePath("/panel/pacientes")
    redirect(`/panel/pacientes/${id}`)
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate key")) {
      return { error: "Ya existe un paciente con ese DNI en la clínica." }
    }
    throw e
  }
}

export async function updatePatientAction(_prev: PatientState, formData: FormData): Promise<PatientState> {
  const { active } = await requireActiveClinic()
  const parsed = patientSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  if (!parsed.data.id) return { error: "Falta id" }
  try {
    await updatePatient(active.clinic_id, parsed.data.id, cleanInput(parsed.data))
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath(`/panel/pacientes/${parsed.data.id}`)
  return null
}

export async function grantConsentAction(formData: FormData) {
  const { active } = await requireActiveClinic()
  const patientId = String(formData.get("patient_id"))
  const consentId = String(formData.get("consent_id"))
  const granted = formData.get("granted") === "on"
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const ua = h.get("user-agent") ?? null
  await grantConsent({
    patient_id: patientId,
    clinic_id: active.clinic_id,
    consent_id: consentId,
    granted,
    granted_ip: ip,
    granted_user_agent: ua,
  })
  revalidatePath(`/panel/pacientes/${patientId}`)
}

export async function anonymizePatientAction(patientId: string) {
  await anonymizePatient(patientId)
  revalidatePath("/panel/pacientes")
  redirect("/panel/pacientes")
}
```

- [ ] **Step 2: `PatientForm.tsx`**

```tsx
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createPatientAction, updatePatientAction, type PatientState } from "./actions"

type Initial = {
  id: string; first_name: string; last_name: string; dni: string | null
  birth_date: string | null; gender: string | null; phone: string | null; email: string | null
  address: string | null; city: string | null; postal_code: string | null
  notes_admin: string | null; referred_by: string | null
} | null

export function PatientForm({ initial }: { initial: Initial }) {
  const isEdit = !!initial
  const action = isEdit ? updatePatientAction : createPatientAction
  const [state, formAction, pending] = useActionState<PatientState, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="first_name" label="Nombre" required defaultValue={initial?.first_name} state={state} />
        <Field name="last_name" label="Apellidos" required defaultValue={initial?.last_name} state={state} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field name="dni" label="DNI" defaultValue={initial?.dni ?? ""} state={state} />
        <Field name="birth_date" label="Fecha nacimiento" type="date" defaultValue={initial?.birth_date ?? ""} state={state} />
        <div className="space-y-1.5">
          <Label htmlFor="gender">Género</Label>
          <Select name="gender" defaultValue={initial?.gender ?? "none"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="f">Femenino</SelectItem>
              <SelectItem value="m">Masculino</SelectItem>
              <SelectItem value="x">Otro</SelectItem>
              <SelectItem value="none">Prefiere no decir</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="phone" label="Teléfono" defaultValue={initial?.phone ?? ""} state={state} />
        <Field name="email" label="Email" type="email" defaultValue={initial?.email ?? ""} state={state} />
      </div>
      <Field name="address" label="Dirección" defaultValue={initial?.address ?? ""} state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="city" label="Ciudad" defaultValue={initial?.city ?? ""} state={state} />
        <Field name="postal_code" label="Código postal" defaultValue={initial?.postal_code ?? ""} state={state} />
      </div>
      <Field name="referred_by" label="¿Cómo nos conoció?" defaultValue={initial?.referred_by ?? ""} state={state} />
      <div className="space-y-1.5">
        <Label htmlFor="notes_admin">Notas administrativas</Label>
        <Textarea id="notes_admin" name="notes_admin" defaultValue={initial?.notes_admin ?? ""} rows={3} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : (isEdit ? "Guardar cambios" : "Crear paciente")}
      </Button>
    </form>
  )
}

function Field({
  name, label, type = "text", required, defaultValue, state,
}: {
  name: string; label: string; type?: string; required?: boolean
  defaultValue?: string; state: PatientState
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} />
      {state?.fieldErrors?.[name] && <p className="text-sm text-destructive">{state.fieldErrors[name][0]}</p>}
    </div>
  )
}
```

- [ ] **Step 3: `nuevo/page.tsx`**

```tsx
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { PatientForm } from "../PatientForm"

export default async function NewPatientPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio", "reception"])
  return (
    <>
      <PageHeader title="Nuevo paciente" description="Datos básicos. Podrás añadir historia clínica después." />
      <div className="p-6"><PatientForm initial={null} /></div>
    </>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(panel): create patient"
```

---

## Task 5.4: Ficha del paciente (datos + consentimientos)

**Files:**
- Create: `app/(panel)/panel/pacientes/[id]/page.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/PatientHeader.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/ConsentsCard.tsx`
- Create: `app/(panel)/panel/pacientes/[id]/DangerZone.tsx`

- [ ] **Step 1: `page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { getPatient } from "@/lib/db/patients"
import { listCurrentConsents, listPatientConsents } from "@/lib/db/consents"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PatientForm } from "../PatientForm"
import { PatientHeader } from "./PatientHeader"
import { ConsentsCard } from "./ConsentsCard"
import { DangerZone } from "./DangerZone"

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await requireActiveClinic()
  let patient
  try { patient = await getPatient(active.clinic_id, id) } catch { notFound() }

  const [currentConsents, patientConsents] = await Promise.all([
    listCurrentConsents(active.clinic_id),
    listPatientConsents(id),
  ])

  return (
    <>
      <PageHeader
        title={`${patient!.last_name}, ${patient!.first_name}`}
        description={patient!.dni ?? "Sin DNI"}
      />
      <div className="p-6">
        <Tabs defaultValue="datos">
          <TabsList>
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="consentimientos">Consentimientos</TabsTrigger>
            <TabsTrigger value="historia">Historia clínica</TabsTrigger>
            <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>
          <TabsContent value="datos" className="space-y-6 pt-4">
            <PatientForm initial={patient!} />
            {active.role === "admin" && <DangerZone patientId={patient!.id} />}
          </TabsContent>
          <TabsContent value="consentimientos" className="pt-4">
            <ConsentsCard
              patientId={patient!.id}
              currentConsents={currentConsents}
              patientConsents={patientConsents}
            />
          </TabsContent>
          <TabsContent value="historia" className="pt-4">
            <PlaceholderTab href={`/panel/pacientes/${patient!.id}/historia`} label="Ir a historia clínica" />
          </TabsContent>
          <TabsContent value="sesiones" className="pt-4">
            <PlaceholderTab href={`/panel/pacientes/${patient!.id}/sesiones`} label="Ver sesiones" />
          </TabsContent>
          <TabsContent value="documentos" className="pt-4">
            <PlaceholderTab href={`/panel/pacientes/${patient!.id}/documentos`} label="Ver documentos" />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function PlaceholderTab({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="inline-block rounded-md border border-dashed bg-card px-6 py-12 text-sm text-muted-foreground hover:bg-muted">
      {label}
    </a>
  )
}
```

- [ ] **Step 2: `ConsentsCard.tsx`**

```tsx
import { grantConsentAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Current = { id: string; kind: string; version: number; title: string; body_markdown: string }
type Granted = {
  id: string; consent_id: string; granted: boolean; granted_at: string; withdrawn_at: string | null
  clinic_consents: { kind: string; version: number; title: string } | null
}

export function ConsentsCard({
  patientId, currentConsents, patientConsents,
}: { patientId: string; currentConsents: Current[]; patientConsents: Granted[] }) {
  const latestByKind = new Map<string, Granted>()
  for (const g of patientConsents) {
    const kind = g.clinic_consents?.kind
    if (!kind) continue
    if (!latestByKind.has(kind)) latestByKind.set(kind, g)
  }
  return (
    <div className="space-y-4">
      {currentConsents.map((c) => {
        const lastGranted = latestByKind.get(c.kind)
        const active = !!lastGranted && lastGranted.granted && !lastGranted.withdrawn_at
        return (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{c.title}
                <Badge className="ml-2" variant="outline">v{c.version}</Badge>
              </CardTitle>
              {active
                ? <Badge variant="secondary">Concedido</Badge>
                : <Badge variant="outline">Pendiente</Badge>}
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{c.body_markdown}</div>
              <form action={grantConsentAction} className="mt-3 flex items-center gap-3">
                <input type="hidden" name="patient_id" value={patientId} />
                <input type="hidden" name="consent_id" value={c.id} />
                {active ? (
                  <Button type="submit" name="granted" value="" variant="outline" size="sm">Retirar consentimiento</Button>
                ) : (
                  <Button type="submit" name="granted" value="on" size="sm">Conceder consentimiento</Button>
                )}
                {lastGranted && (
                  <span className="text-xs text-muted-foreground">
                    Último registro: {new Date(lastGranted.granted_at).toLocaleString("es-ES")}
                  </span>
                )}
              </form>
            </CardContent>
          </Card>
        )
      })}
      {currentConsents.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Esta clínica no tiene consentimientos publicados. Pídele al admin que los publique en Ajustes → Consentimientos.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `DangerZone.tsx` (anonimización)**

```tsx
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
              Esta acción no se puede deshacer. Escribe "ANONIMIZAR" para confirmar.
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
```

- [ ] **Step 4: `PatientHeader.tsx`**

No es necesaria si la cabecera ya está en `page.tsx`. Saltar; eliminar referencia.

- [ ] **Step 5: Verificación manual**

```bash
pnpm dev
```

1. Crear un paciente.
2. Conceder consentimiento de tratamiento.
3. Retirarlo y volver a concederlo (deben quedar registros en `patient_consents`).
4. Anonimizar (sólo si eres admin). El nombre debe cambiar a "Anonimizado" y desaparecer del listado.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(panel): patient detail page with consents and anonymize"
```

---

## Self-check de la fase

```bash
pnpm typecheck && pnpm test && pnpm build
```

Manual:
- Búsqueda filtra correctamente.
- Crear/editar paciente persiste.
- DNI duplicado en la misma clínica falla con mensaje.
- Consentimientos: granted / withdrawn quedan registrados con timestamps.
- Anonimización funciona y elimina el paciente del listado activo.

## Siguiente fase

`2026-06-09-fisio-crm-06-agenda.md` — Calendario, citas, drag&drop y validación anti-solapamiento.
