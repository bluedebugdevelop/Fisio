# Fisio CRM — Fase 4: Gestión de la clínica

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Permitir al admin poblar la clínica con profesionales, salas, tipos de servicio y miembros, y editar los datos de la propia clínica.

**Architecture:** Cada recurso es un CRUD simple Server Component (lista) + Server Action (mutaciones). Forms con react-hook-form en cliente para validación instantánea. Datos siempre vía `lib/db/<entity>.ts`.

**Tech Stack:** shadcn (DataTable manual con Table + filtros, Dialog, Form), zod, react-hook-form.

---

## Task 4.1: Componente `DataTable` reusable

**Files:**
- Create: `components/shared/DataTable.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { EmptyState } from "./EmptyState"
import type { ReactNode } from "react"

type Column<T> = {
  key: string
  header: string
  className?: string
  render: (row: T) => ReactNode
}

export function DataTable<T extends { id: string }>({
  rows, columns, empty,
}: {
  rows: T[]
  columns: Column<T>[]
  empty: { title: string; description?: string; action?: ReactNode }
}) {
  if (rows.length === 0) {
    return <EmptyState {...empty} />
  }
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>{c.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: `components/shared/EmptyState.tsx`**

```tsx
import type { ReactNode } from "react"

export function EmptyState({
  title, description, action,
}: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-12 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(panel): reusable DataTable and EmptyState"
```

---

## Task 4.2: Personal — capas de datos y dominio compartido

**Files:**
- Create: `lib/db/professionals.ts`
- Create: `lib/db/rooms.ts`
- Create: `lib/db/service-types.ts`
- Create: `lib/db/members.ts`

- [ ] **Step 1: `lib/db/professionals.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type ProfessionalRow = {
  id: string
  display_name: string
  license_number: string | null
  specialty: string | null
  color: string
  default_appointment_minutes: number
  is_active: boolean
  user_id: string
}

export async function listProfessionals(clinicId: string): Promise<ProfessionalRow[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("professionals")
    .select("id, display_name, license_number, specialty, color, default_appointment_minutes, is_active, user_id")
    .eq("clinic_id", clinicId)
    .order("display_name")
  if (error) throw error
  return (data ?? []) as ProfessionalRow[]
}

export async function upsertProfessional(input: {
  id?: string
  clinic_id: string
  user_id: string
  display_name: string
  license_number?: string | null
  specialty?: string | null
  color?: string
  default_appointment_minutes?: number
  is_active?: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("professionals").upsert(input)
  if (error) throw error
}

export async function setProfessionalActive(id: string, active: boolean) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("professionals").update({ is_active: active }).eq("id", id)
  if (error) throw error
}
```

- [ ] **Step 2: `lib/db/rooms.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function listRooms(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, kind, capacity, color, is_active")
    .eq("clinic_id", clinicId)
    .order("name")
  if (error) throw error
  return data ?? []
}

export async function upsertRoom(input: {
  id?: string
  clinic_id: string
  name: string
  kind: "consulta" | "box" | "gimnasio" | "otro"
  capacity?: number
  color?: string
  is_active?: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("rooms").upsert(input)
  if (error) throw error
}
```

- [ ] **Step 3: `lib/db/service-types.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function listServiceTypes(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("service_types")
    .select("id, name, duration_minutes, color, price_cents, is_active")
    .eq("clinic_id", clinicId)
    .order("name")
  if (error) throw error
  return data ?? []
}

export async function upsertServiceType(input: {
  id?: string
  clinic_id: string
  name: string
  duration_minutes: number
  color?: string
  price_cents?: number | null
  is_active?: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("service_types").upsert(input)
  if (error) throw error
}
```

- [ ] **Step 4: `lib/db/members.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceClient } from "@/lib/supabase/service"
import crypto from "node:crypto"
import type { Database } from "@/lib/supabase/types"

type Role = Database["public"]["Enums"]["member_role"]

export async function listMembers(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: members, error } = await supabase
    .from("clinic_members")
    .select("id, role, is_active, user_id, created_at")
    .eq("clinic_id", clinicId)
  if (error) throw error

  if (!members || members.length === 0) return []

  const service = createSupabaseServiceClient()
  const result = await Promise.all(members.map(async (m) => {
    const { data: user } = await service.auth.admin.getUserById(m.user_id)
    return {
      ...m,
      email: user.user?.email ?? "(sin email)",
      name: (user.user?.user_metadata?.full_name as string | undefined) ?? null,
    }
  }))
  return result
}

export async function listInvitations(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinic_invitations")
    .select("id, email, role, expires_at, accepted_at, created_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createInvitation(input: { clinic_id: string; email: string; role: Role; invited_by: string }) {
  const supabase = await createSupabaseServerClient()
  const token = crypto.randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase.from("clinic_invitations").insert({
    clinic_id: input.clinic_id,
    email: input.email,
    role: input.role,
    invited_by: input.invited_by,
    token,
    expires_at: expiresAt,
  })
  if (error) throw error
  return token
}

export async function setMemberActive(id: string, active: boolean) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("clinic_members").update({ is_active: active }).eq("id", id)
  if (error) throw error
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(db): data access for professionals, rooms, service_types and members"
```

---

## Task 4.3: Personal — página + Dialog para fisios

**Files:**
- Create: `app/(panel)/panel/personal/page.tsx`
- Create: `app/(panel)/panel/personal/fisios/page.tsx`
- Create: `app/(panel)/panel/personal/fisios/ProfessionalsTable.tsx`
- Create: `app/(panel)/panel/personal/fisios/ProfessionalDialog.tsx`
- Create: `app/(panel)/panel/personal/fisios/actions.ts`

- [ ] **Step 1: Página índice `personal/page.tsx`**

Sustituir el stub por:

```tsx
import Link from "next/link"
import { PageHeader } from "@/components/panel/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCog, DoorOpen, ListChecks, Mail } from "lucide-react"

const items = [
  { href: "/panel/personal/fisios", title: "Fisioterapeutas", description: "Profesionales que atienden.", icon: UserCog },
  { href: "/panel/personal/salas", title: "Salas", description: "Espacios físicos de la clínica.", icon: DoorOpen },
  { href: "/panel/personal/servicios", title: "Tipos de servicio", description: "Sesiones, duraciones y precios.", icon: ListChecks },
  { href: "/panel/personal/miembros", title: "Miembros e invitaciones", description: "Quién accede a la clínica.", icon: Mail },
]

export default function PersonalIndex() {
  return (
    <>
      <PageHeader title="Personal y recursos" description="Configura quién atiende, dónde y con qué tipos de sesión." />
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3">
                <it.icon className="size-5 text-primary" />
                <CardTitle className="text-base">{it.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{it.description}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Actions `personal/fisios/actions.ts`**

```ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { setProfessionalActive, upsertProfessional } from "@/lib/db/professionals"

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  user_id: z.string().uuid("Selecciona un usuario"),
  display_name: z.string().min(2, "Nombre visible obligatorio"),
  license_number: z.string().optional().or(z.literal("")),
  specialty: z.string().optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color HEX requerido"),
  default_appointment_minutes: z.coerce.number().int().min(5).max(480),
})

export type ProfessionalState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | null

export async function saveProfessionalAction(_prev: ProfessionalState, formData: FormData): Promise<ProfessionalState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    await upsertProfessional({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      user_id: parsed.data.user_id,
      display_name: parsed.data.display_name,
      license_number: parsed.data.license_number || null,
      specialty: parsed.data.specialty || null,
      color: parsed.data.color,
      default_appointment_minutes: parsed.data.default_appointment_minutes,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error guardando fisio" }
  }
  revalidatePath("/panel/personal/fisios")
  return null
}

export async function toggleProfessionalActiveAction(id: string, active: boolean) {
  await setProfessionalActive(id, active)
  revalidatePath("/panel/personal/fisios")
}
```

- [ ] **Step 3: Página de fisios**

```tsx
// app/(panel)/panel/personal/fisios/page.tsx
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listProfessionals } from "@/lib/db/professionals"
import { listMembers } from "@/lib/db/members"
import { ProfessionalsTable } from "./ProfessionalsTable"
import { ProfessionalDialog } from "./ProfessionalDialog"

export default async function FisiosPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const [professionals, members] = await Promise.all([
    listProfessionals(active.clinic_id),
    listMembers(active.clinic_id),
  ])
  const candidates = members.filter((m) => m.role === "physio" || m.role === "admin")
  return (
    <>
      <PageHeader
        title="Fisioterapeutas"
        description="Profesionales que aparecen en la agenda."
        actions={<ProfessionalDialog candidates={candidates} />}
      />
      <div className="p-6">
        <ProfessionalsTable rows={professionals} candidates={candidates} />
      </div>
    </>
  )
}
```

- [ ] **Step 4: `ProfessionalsTable.tsx`**

```tsx
"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/shared/DataTable"
import { ProfessionalDialog } from "./ProfessionalDialog"
import { toggleProfessionalActiveAction } from "./actions"
import { useTransition } from "react"

type Row = {
  id: string; display_name: string; license_number: string | null; specialty: string | null
  color: string; default_appointment_minutes: number; is_active: boolean; user_id: string
}

type Candidate = { user_id: string; email: string; name: string | null; role: string }

export function ProfessionalsTable({ rows, candidates }: { rows: Row[]; candidates: Candidate[] }) {
  const [pending, start] = useTransition()
  return (
    <DataTable
      rows={rows}
      empty={{
        title: "Aún no hay fisios",
        description: "Añade el primer fisio para que aparezca en la agenda.",
      }}
      columns={[
        { key: "color", header: "", className: "w-6",
          render: (r) => <span className="inline-block size-3 rounded-full" style={{ background: r.color }} /> },
        { key: "name", header: "Nombre", render: (r) => r.display_name },
        { key: "specialty", header: "Especialidad", render: (r) => r.specialty ?? "—" },
        { key: "license", header: "Colegiado", render: (r) => r.license_number ?? "—" },
        { key: "duration", header: "Min/cita", render: (r) => r.default_appointment_minutes },
        { key: "status", header: "Estado",
          render: (r) => r.is_active
            ? <Badge variant="secondary">Activo</Badge>
            : <Badge variant="outline">Inactivo</Badge> },
        { key: "actions", header: "", className: "w-40 text-right",
          render: (r) => (
            <div className="flex justify-end gap-2">
              <ProfessionalDialog candidates={candidates} initial={r} />
              <Button
                variant="ghost" size="sm" disabled={pending}
                onClick={() => start(() => toggleProfessionalActiveAction(r.id, !r.is_active))}
              >
                {r.is_active ? "Desactivar" : "Activar"}
              </Button>
            </div>
          ) },
      ]}
    />
  )
}
```

- [ ] **Step 5: `ProfessionalDialog.tsx`**

```tsx
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
```

- [ ] **Step 6: Verificación manual**

```bash
pnpm dev
```

Ir a `/panel/personal/fisios`. Crear un fisio asociado al usuario actual. Verificar que aparece y se puede editar.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(panel): manage professionals (list, add, edit, toggle active)"
```

---

## Task 4.4: Salas (rooms)

**Files:**
- Create: `app/(panel)/panel/personal/salas/page.tsx`
- Create: `app/(panel)/panel/personal/salas/RoomsTable.tsx`
- Create: `app/(panel)/panel/personal/salas/RoomDialog.tsx`
- Create: `app/(panel)/panel/personal/salas/actions.ts`

- [ ] **Step 1: Actions**

```ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { upsertRoom } from "@/lib/db/rooms"

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(1, "Nombre obligatorio"),
  kind: z.enum(["consulta", "box", "gimnasio", "otro"]),
  capacity: z.coerce.number().int().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  is_active: z.coerce.boolean().optional(),
})

export type RoomState = { error?: string; fieldErrors?: Record<string, string[]> } | null

export async function saveRoomAction(_prev: RoomState, formData: FormData): Promise<RoomState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    await upsertRoom({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      capacity: parsed.data.capacity,
      color: parsed.data.color,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath("/panel/personal/salas")
  return null
}
```

- [ ] **Step 2: Página + tabla + dialog**

Aplicar el mismo patrón que para fisios. Campos del dialog: `name`, `kind` (select consulta/box/gimnasio/otro), `capacity`, `color`. Misma estructura UI: PageHeader + DataTable + Dialog.

`page.tsx`:

```tsx
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listRooms } from "@/lib/db/rooms"
import { RoomDialog } from "./RoomDialog"
import { RoomsTable } from "./RoomsTable"

export default async function RoomsPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const rooms = await listRooms(active.clinic_id)
  return (
    <>
      <PageHeader title="Salas" description="Espacios físicos disponibles para citas." actions={<RoomDialog />} />
      <div className="p-6"><RoomsTable rows={rooms} /></div>
    </>
  )
}
```

`RoomsTable.tsx`:

```tsx
"use client"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"
import { RoomDialog } from "./RoomDialog"

type Row = { id: string; name: string; kind: string; capacity: number; color: string; is_active: boolean }

export function RoomsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin salas", description: "Añade tu primera sala." }}
      columns={[
        { key: "color", header: "", className: "w-6", render: (r) => <span className="inline-block size-3 rounded-full" style={{ background: r.color }} /> },
        { key: "name", header: "Nombre", render: (r) => r.name },
        { key: "kind", header: "Tipo", render: (r) => r.kind },
        { key: "capacity", header: "Capacidad", render: (r) => r.capacity },
        { key: "status", header: "Estado", render: (r) => r.is_active ? <Badge variant="secondary">Activa</Badge> : <Badge variant="outline">Inactiva</Badge> },
        { key: "actions", header: "", className: "w-24 text-right", render: (r) => <RoomDialog initial={r} /> },
      ]}
    />
  )
}
```

`RoomDialog.tsx`: análogo a `ProfessionalDialog` con campos `name`, `kind` (Select), `capacity`, `color`. Estado inicial via prop `initial`. Implementarlo siguiendo el patrón exacto del dialog de fisios.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(panel): manage rooms"
```

---

## Task 4.5: Servicios (service_types)

**Files:**
- Create: `app/(panel)/panel/personal/servicios/page.tsx`
- Create: `app/(panel)/panel/personal/servicios/ServiceTypesTable.tsx`
- Create: `app/(panel)/panel/personal/servicios/ServiceTypeDialog.tsx`
- Create: `app/(panel)/panel/personal/servicios/actions.ts`

- [ ] **Step 1: Actions**

```ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { upsertServiceType } from "@/lib/db/service-types"

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(1),
  duration_minutes: z.coerce.number().int().min(5).max(480),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  price_euros: z.coerce.number().min(0).optional(),
})

export type ServiceTypeState = { error?: string; fieldErrors?: Record<string, string[]> } | null

export async function saveServiceTypeAction(_prev: ServiceTypeState, formData: FormData): Promise<ServiceTypeState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    await upsertServiceType({
      id: parsed.data.id || undefined,
      clinic_id: active.clinic_id,
      name: parsed.data.name,
      duration_minutes: parsed.data.duration_minutes,
      color: parsed.data.color,
      price_cents: parsed.data.price_euros != null ? Math.round(parsed.data.price_euros * 100) : null,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
  revalidatePath("/panel/personal/servicios")
  return null
}
```

- [ ] **Step 2: Página + tabla + dialog**

Patrón idéntico a salas. Columnas de tabla: color, nombre, duración (min), precio (euros), estado, acciones.

Para mostrar precio: `(r.price_cents ? (r.price_cents / 100).toFixed(2) + " €" : "—")`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(panel): manage service types"
```

---

## Task 4.6: Miembros e invitaciones

**Files:**
- Create: `app/(panel)/panel/personal/miembros/page.tsx`
- Create: `app/(panel)/panel/personal/miembros/MembersTable.tsx`
- Create: `app/(panel)/panel/personal/miembros/InvitationsTable.tsx`
- Create: `app/(panel)/panel/personal/miembros/InviteDialog.tsx`
- Create: `app/(panel)/panel/personal/miembros/actions.ts`
- Create: `app/(auth)/invite/[token]/page.tsx`
- Create: `app/(auth)/invite/[token]/AcceptForm.tsx`
- Create: `app/(auth)/invite/[token]/actions.ts`

- [ ] **Step 1: Actions de invitación**

```ts
// app/(panel)/panel/personal/miembros/actions.ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { createInvitation, setMemberActive } from "@/lib/db/members"

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "physio", "reception"]),
})

export type InviteState = { error?: string; fieldErrors?: Record<string, string[]>; token?: string } | null

export async function createInvitationAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { user, active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  try {
    const token = await createInvitation({
      clinic_id: active.clinic_id,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: user.id,
    })
    revalidatePath("/panel/personal/miembros")
    return { token }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" }
  }
}

export async function toggleMemberActiveAction(id: string, active: boolean) {
  await setMemberActive(id, active)
  revalidatePath("/panel/personal/miembros")
}
```

- [ ] **Step 2: Página miembros**

```tsx
// app/(panel)/panel/personal/miembros/page.tsx
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listInvitations, listMembers } from "@/lib/db/members"
import { MembersTable } from "./MembersTable"
import { InvitationsTable } from "./InvitationsTable"
import { InviteDialog } from "./InviteDialog"

export default async function MembersPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const [members, invitations] = await Promise.all([
    listMembers(active.clinic_id),
    listInvitations(active.clinic_id),
  ])
  return (
    <>
      <PageHeader
        title="Miembros e invitaciones"
        description="Personas con acceso a esta clínica."
        actions={<InviteDialog />}
      />
      <div className="space-y-6 p-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Miembros</h2>
          <MembersTable rows={members} />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invitaciones pendientes</h2>
          <InvitationsTable rows={invitations} />
        </section>
      </div>
    </>
  )
}
```

- [ ] **Step 3: `MembersTable.tsx`**

```tsx
"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/shared/DataTable"
import { toggleMemberActiveAction } from "./actions"
import { useTransition } from "react"

type Row = { id: string; role: string; is_active: boolean; email: string; name: string | null; created_at: string }

export function MembersTable({ rows }: { rows: Row[] }) {
  const [pending, start] = useTransition()
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin miembros adicionales", description: "Aún eres el único miembro." }}
      columns={[
        { key: "name", header: "Nombre", render: (r) => r.name ?? "—" },
        { key: "email", header: "Email", render: (r) => r.email },
        { key: "role", header: "Rol", render: (r) => <Badge variant="outline">{r.role}</Badge> },
        { key: "status", header: "Estado",
          render: (r) => r.is_active
            ? <Badge variant="secondary">Activo</Badge>
            : <Badge variant="outline">Bloqueado</Badge> },
        { key: "actions", header: "", className: "w-32 text-right",
          render: (r) => (
            <Button
              variant="ghost" size="sm" disabled={pending}
              onClick={() => start(() => toggleMemberActiveAction(r.id, !r.is_active))}
            >
              {r.is_active ? "Bloquear" : "Reactivar"}
            </Button>
          ) },
      ]}
    />
  )
}
```

- [ ] **Step 4: `InvitationsTable.tsx`**

```tsx
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"

type Row = { id: string; email: string; role: string; expires_at: string; accepted_at: string | null }

export function InvitationsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin invitaciones", description: "No has invitado a nadie todavía." }}
      columns={[
        { key: "email", header: "Email", render: (r) => r.email },
        { key: "role", header: "Rol", render: (r) => <Badge variant="outline">{r.role}</Badge> },
        { key: "expires", header: "Caduca",
          render: (r) => new Date(r.expires_at).toLocaleDateString("es-ES") },
        { key: "status", header: "Estado",
          render: (r) => r.accepted_at
            ? <Badge variant="secondary">Aceptada</Badge>
            : <Badge variant="outline">Pendiente</Badge> },
      ]}
    />
  )
}
```

- [ ] **Step 5: `InviteDialog.tsx`**

```tsx
"use client"
import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createInvitationAction, type InviteState } from "./actions"

export function InviteDialog() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvitationAction, null)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Invitar miembro</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva invitación</DialogTitle></DialogHeader>
        <form action={action} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            {state?.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Rol</Label>
            <Select name="role" defaultValue="physio">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="physio">Fisioterapeuta</SelectItem>
                <SelectItem value="reception">Recepción</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.token && (
            <div className="rounded-md bg-muted p-3 text-xs">
              <div className="font-semibold">Enlace para enviar al invitado:</div>
              <code className="break-all">
                {`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${state.token}`}
              </code>
              <p className="mt-2 text-muted-foreground">
                Cópialo y envíalo por email. (En esta fase no enviamos email automático.)
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creando..." : "Crear invitación"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6: Página `/invite/[token]` (aceptar invitación)**

```tsx
// app/(auth)/invite/[token]/page.tsx
import { notFound } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { AcceptForm } from "./AcceptForm"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createSupabaseServerClient()
  // Buscamos la invitación con service role? No: la propia RLS impide. Para que el aceptante (que no es miembro) pueda verla,
  // creamos una RPC `accept_invitation(token text)` que valida y promueve atómicamente.
  // En esta fase devolvemos sólo el email/role para mostrar info, vía RPC `get_invitation_preview(token)`.

  const { data, error } = await supabase.rpc("get_invitation_preview", { p_token: token })
  if (error || !data) notFound()

  return (
    <AuthShell title="Aceptar invitación" description={`Te invitan a unirte como ${data.role}.`}>
      <AcceptForm token={token} email={data.email} />
    </AuthShell>
  )
}
```

- [ ] **Step 7: Migración adicional con las RPCs de invitación**

Crear `supabase/migrations/0010_invitations_rpc.sql`:

```sql
create or replace function public.get_invitation_preview(p_token text)
returns table(email text, role member_role)
language sql security definer set search_path = public as $$
  select email, role from clinic_invitations
  where token = p_token and accepted_at is null and expires_at > now()
  limit 1
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_inv clinic_invitations%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select * into v_inv from clinic_invitations
  where token = p_token and accepted_at is null and expires_at > now()
  for update;
  if v_inv.id is null then raise exception 'invitation invalid'; end if;

  insert into clinic_members(clinic_id, user_id, role, invited_by)
  values (v_inv.clinic_id, v_user, v_inv.role, v_inv.invited_by)
  on conflict (clinic_id, user_id) do update set role = excluded.role, is_active = true;

  update clinic_invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.clinic_id;
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;
```

Aplicar:

```bash
pnpm dlx supabase db push
pnpm db:types
```

- [ ] **Step 8: `app/(auth)/invite/[token]/AcceptForm.tsx` y `actions.ts`**

```ts
// actions.ts
"use server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ACTIVE_CLINIC_COOKIE } from "@/lib/auth/clinic-context"

export async function acceptInvitationAction(token: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token })
  if (error || !data) throw new Error(error?.message ?? "No se pudo aceptar")
  const jar = await cookies()
  jar.set(ACTIVE_CLINIC_COOKIE, data, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  })
  redirect("/panel")
}
```

```tsx
// AcceptForm.tsx
"use client"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { acceptInvitationAction } from "./actions"

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const [pending, start] = useTransition()
  return (
    <div className="space-y-4 text-sm">
      <p>Invitación dirigida a <strong>{email}</strong>.</p>
      <p className="text-muted-foreground">
        Asegúrate de haber iniciado sesión con ese email. Al aceptar te unirás a la clínica.
      </p>
      <Button onClick={() => start(() => acceptInvitationAction(token))} disabled={pending} className="w-full">
        {pending ? "Aceptando..." : "Aceptar invitación"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(panel): members and invitations (create, accept, list)"
```

---

## Task 4.7: Datos de la clínica + consentimientos editables

**Files:**
- Modify: `app/(panel)/panel/clinica/page.tsx`
- Create: `app/(panel)/panel/clinica/ClinicForm.tsx`
- Create: `app/(panel)/panel/clinica/actions.ts`
- Create: `app/(panel)/panel/ajustes/consentimientos/page.tsx`
- Create: `app/(panel)/panel/ajustes/consentimientos/ConsentForm.tsx`
- Create: `app/(panel)/panel/ajustes/consentimientos/actions.ts`

- [ ] **Step 1: `clinica/actions.ts`**

```ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const schema = z.object({
  name: z.string().min(2),
  legal_name: z.string().optional().or(z.literal("")),
  cif: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  timezone: z.string(),
  dpo_contact: z.string().optional().or(z.literal("")),
})

export type ClinicFormState = { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean } | null

export async function updateClinicAction(_prev: ClinicFormState, formData: FormData): Promise<ClinicFormState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const payload = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v])
  )
  const { error } = await supabase.from("clinics").update(payload).eq("id", active.clinic_id)
  if (error) return { error: error.message }
  revalidatePath("/panel", "layout")
  return { ok: true }
}
```

- [ ] **Step 2: `clinica/ClinicForm.tsx` y `page.tsx`**

Form con los mismos campos que onboarding pero pre-poblado con `clinics` y un selector de timezone (Europe/Madrid, Atlantic/Canary, etc.).

`page.tsx`:

```tsx
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ClinicForm } from "./ClinicForm"

export default async function ClinicPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from("clinics").select("*").eq("id", active.clinic_id).single()
  return (
    <>
      <PageHeader title="Datos de la clínica" description="Información fiscal, de contacto y zona horaria." />
      <div className="p-6 max-w-2xl"><ClinicForm initial={data!} /></div>
    </>
  )
}
```

`ClinicForm.tsx`: análogo al `OnboardingForm` pero con valores iniciales y mostrando `ok: true` como toast/mensaje al guardar correctamente.

- [ ] **Step 3: Consentimientos**

`ajustes/consentimientos/actions.ts`:

```ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const schema = z.object({
  kind: z.enum(["tratamiento", "comunicaciones", "imagen", "menores"]),
  title: z.string().min(1),
  body_markdown: z.string().min(1),
})

export type ConsentState = { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean } | null

export async function publishConsentAction(_prev: ConsentState, formData: FormData): Promise<ConsentState> {
  const { active } = await requireActiveClinic()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  // Calcula próxima versión
  const { data: last } = await supabase
    .from("clinic_consents")
    .select("version")
    .eq("clinic_id", active.clinic_id)
    .eq("kind", parsed.data.kind)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = (last?.version ?? 0) + 1
  // Marca anteriores como no actuales
  await supabase
    .from("clinic_consents")
    .update({ is_current: false })
    .eq("clinic_id", active.clinic_id)
    .eq("kind", parsed.data.kind)
  const { error } = await supabase.from("clinic_consents").insert({
    clinic_id: active.clinic_id,
    kind: parsed.data.kind,
    version: nextVersion,
    title: parsed.data.title,
    body_markdown: parsed.data.body_markdown,
    is_current: true,
  })
  if (error) return { error: error.message }
  revalidatePath("/panel/ajustes/consentimientos")
  return { ok: true }
}
```

`page.tsx`: lista actuales + form para publicar nueva versión por tipo. Mostrar el texto vigente para cada `kind`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(panel): edit clinic data and publish consent versions"
```

---

## Self-check de la fase

```bash
pnpm typecheck && pnpm test && pnpm build
```

Manual:
- Crear un fisio, una sala, un servicio. Aparecen en sus listados.
- Invitar a un email. El token se muestra. Al pegarlo en otra sesión (otro usuario) entra a `/invite/<token>` y puede aceptar.
- Editar los datos de la clínica y publicar nueva versión de consentimiento.

## Siguiente fase

`2026-06-09-fisio-crm-05-patients.md` — Gestión de pacientes con consentimientos versionados.
