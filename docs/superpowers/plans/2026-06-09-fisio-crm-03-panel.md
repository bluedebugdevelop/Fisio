# Fisio CRM — Fase 3: Layout del panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Dar al panel un esqueleto navegable con sidebar, header, selector de clínica activa, dashboard de bienvenida y rutas creadas (vacías) para todos los módulos del MVP.

**Architecture:** Layout en `app/(panel)/layout.tsx` con sidebar de Server Component que recibe `memberships`. Selector de clínica como Client Component que setea cookie y recarga. Cada módulo tiene `page.tsx` mínimo que verificamos navegable.

**Tech Stack:** shadcn (Sheet, DropdownMenu, Separator, Avatar), `next/navigation`.

---

## Task 3.1: Sidebar y navegación

**Files:**
- Create: `components/panel/Sidebar.tsx`
- Create: `components/panel/SidebarNav.tsx`
- Create: `components/panel/NavLink.tsx`
- Modify: `app/(panel)/layout.tsx`

- [ ] **Step 1: `components/panel/NavLink.tsx`**

```tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function NavLink({ href, icon, children }: { href: string; icon?: ReactNode; children: ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}
```

- [ ] **Step 2: `components/panel/SidebarNav.tsx`**

```tsx
import {
  Calendar, Users, UserCog, Building2, Bell, Settings, LayoutDashboard,
} from "lucide-react"
import { NavLink } from "./NavLink"
import type { Database } from "@/lib/supabase/types"

type Role = Database["public"]["Enums"]["member_role"]

export function SidebarNav({ role }: { role: Role }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      <NavLink href="/panel" icon={<LayoutDashboard className="size-4" />}>Inicio</NavLink>
      <NavLink href="/panel/agenda" icon={<Calendar className="size-4" />}>Agenda</NavLink>
      <NavLink href="/panel/pacientes" icon={<Users className="size-4" />}>Pacientes</NavLink>
      {role === "admin" && (
        <>
          <div className="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administración
          </div>
          <NavLink href="/panel/personal" icon={<UserCog className="size-4" />}>Personal</NavLink>
          <NavLink href="/panel/clinica" icon={<Building2 className="size-4" />}>Clínica</NavLink>
          <NavLink href="/panel/recordatorios" icon={<Bell className="size-4" />}>Recordatorios</NavLink>
          <NavLink href="/panel/ajustes" icon={<Settings className="size-4" />}>Ajustes</NavLink>
        </>
      )}
    </nav>
  )
}
```

Necesitamos `lucide-react`:

```bash
pnpm add lucide-react
```

- [ ] **Step 3: `components/panel/Sidebar.tsx`**

```tsx
import { SidebarNav } from "./SidebarNav"
import { ClinicSwitcher } from "./ClinicSwitcher"
import type { Database } from "@/lib/supabase/types"

type Role = Database["public"]["Enums"]["member_role"]

export function Sidebar({
  clinicName,
  memberships,
  activeId,
  role,
}: {
  clinicName: string
  memberships: { clinic_id: string; clinics: { id: string; name: string } | null }[]
  activeId: string
  role: Role
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="border-b px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fisio CRM</div>
        <ClinicSwitcher memberships={memberships} activeId={activeId} clinicName={clinicName} />
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav role={role} />
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Commit (sin renderizar todavía; pendiente Task 3.2 para ClinicSwitcher)**

Saltamos a Task 3.2.

---

## Task 3.2: ClinicSwitcher

**Files:**
- Create: `components/panel/ClinicSwitcher.tsx`
- Create: `app/(panel)/actions.ts`

- [ ] **Step 1: Server action para cambiar la clínica activa**

`app/(panel)/actions.ts`:

```ts
"use server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { ACTIVE_CLINIC_COOKIE } from "@/lib/auth/clinic-context"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function setActiveClinicAction(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .maybeSingle()
  if (!data) throw new Error("Clínica no autorizada")

  const jar = await cookies()
  jar.set(ACTIVE_CLINIC_COOKIE, clinicId, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  })
  revalidatePath("/panel", "layout")
}
```

- [ ] **Step 2: Componente Switcher**

```tsx
"use client"
import { Check, ChevronsUpDown } from "lucide-react"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setActiveClinicAction } from "@/app/(panel)/actions"

export function ClinicSwitcher({
  memberships, activeId, clinicName,
}: {
  memberships: { clinic_id: string; clinics: { id: string; name: string } | null }[]
  activeId: string
  clinicName: string
}) {
  const [pending, startTransition] = useTransition()
  if (memberships.length <= 1) {
    return <div className="mt-2 text-sm font-semibold">{clinicName}</div>
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="mt-2 w-full justify-between px-2" disabled={pending}>
          <span className="truncate text-left text-sm font-semibold">{clinicName}</span>
          <ChevronsUpDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.clinic_id}
            onSelect={() => startTransition(() => setActiveClinicAction(m.clinic_id))}
          >
            <span className="flex-1 truncate">{m.clinics?.name}</span>
            {m.clinic_id === activeId && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(panel): sidebar with clinic switcher"
```

---

## Task 3.3: Header con usuario y logout

**Files:**
- Create: `components/panel/PanelHeader.tsx`

- [ ] **Step 1: `components/panel/PanelHeader.tsx`**

```tsx
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { logoutAction } from "@/app/(auth)/actions"

export function PanelHeader({ email, name }: { email: string; name?: string }) {
  const initials = (name ?? email).slice(0, 2).toUpperCase()
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="text-sm text-muted-foreground">Panel</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Avatar className="size-7"><AvatarFallback>{initials}</AvatarFallback></Avatar>
            <span className="hidden text-sm md:inline">{name ?? email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action={logoutAction} className="w-full">
              <button className="w-full text-left" type="submit">Cerrar sesión</button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(panel): header with user menu"
```

---

## Task 3.4: Ensamblar layout del panel

**Files:**
- Modify: `app/(panel)/layout.tsx`

- [ ] **Step 1: Reescribir layout**

```tsx
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { Sidebar } from "@/components/panel/Sidebar"
import { PanelHeader } from "@/components/panel/PanelHeader"

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, active } = await requireActiveClinic()
  const clinicName = active.clinics?.name ?? "Clínica"
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        memberships={memberships}
        activeId={active.clinic_id}
        clinicName={clinicName}
        role={active.role}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <PanelHeader
          email={user.email ?? ""}
          name={(user.user_metadata?.full_name as string | undefined) ?? undefined}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(panel): assemble layout with sidebar and header"
```

---

## Task 3.5: Dashboard (panel home)

**Files:**
- Modify: `app/(panel)/panel/page.tsx`
- Create: `components/panel/PageHeader.tsx`
- Create: `lib/db/dashboard.ts`

- [ ] **Step 1: `components/panel/PageHeader.tsx`**

```tsx
import type { ReactNode } from "react"

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b bg-card px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
```

- [ ] **Step 2: `lib/db/dashboard.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function getDashboardStats(clinicId: string) {
  const supabase = await createSupabaseServerClient()
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const [todayApps, totalPatients, upcoming] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .not("status", "in", "(cancelled,no_show)"),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase
      .from("appointments")
      .select("id, starts_at, status, patients(first_name, last_name), professionals(display_name)")
      .eq("clinic_id", clinicId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
  ])
  return {
    todayCount: todayApps.count ?? 0,
    patientsCount: totalPatients.count ?? 0,
    upcoming: upcoming.data ?? [],
  }
}
```

- [ ] **Step 3: `app/(panel)/panel/page.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { getDashboardStats } from "@/lib/db/dashboard"

export default async function PanelHome() {
  const { active } = await requireActiveClinic()
  const stats = await getDashboardStats(active.clinic_id)

  return (
    <>
      <PageHeader
        title={`Hola, ${active.clinics?.name}`}
        description="Resumen de tu clínica para hoy."
      />
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Citas de hoy" value={stats.todayCount} />
        <StatCard label="Pacientes activos" value={stats.patientsCount} />
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Próximas citas</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.upcoming.length === 0 && (
              <p className="text-muted-foreground">Sin citas próximas.</p>
            )}
            {stats.upcoming.map((a) => (
              <div key={a.id} className="flex justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0">
                <span className="truncate">
                  {a.patients?.first_name} {a.patients?.last_name}
                </span>
                <span className="text-muted-foreground">
                  {new Date(a.starts_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(panel): dashboard with today and upcoming stats"
```

---

## Task 3.6: Stubs de páginas para módulos

**Files:**
- Create: `app/(panel)/panel/agenda/page.tsx`
- Create: `app/(panel)/panel/pacientes/page.tsx`
- Create: `app/(panel)/panel/personal/page.tsx`
- Create: `app/(panel)/panel/clinica/page.tsx`
- Create: `app/(panel)/panel/recordatorios/page.tsx`
- Create: `app/(panel)/panel/ajustes/page.tsx`

- [ ] **Step 1: Crear cada stub**

Para cada ruta (ejemplo, repetir para todas):

```tsx
// app/(panel)/panel/agenda/page.tsx
import { PageHeader } from "@/components/panel/PageHeader"

export default function AgendaStubPage() {
  return (
    <>
      <PageHeader title="Agenda" description="Próximamente: calendario de citas." />
      <div className="p-6 text-sm text-muted-foreground">En construcción.</div>
    </>
  )
}
```

Hacer lo mismo cambiando título para: Pacientes, Personal, Clínica, Recordatorios, Ajustes.

- [ ] **Step 2: Verificación manual de navegación**

```bash
pnpm dev
```

Entrar en cada enlace del sidebar y verificar que el contenido cambia y la URL refleja la ruta.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(panel): module page stubs (agenda, pacientes, personal, clinica, recordatorios, ajustes)"
```

---

## Self-check de la fase

```bash
pnpm typecheck && pnpm test && pnpm build
```

Manual:
- Sidebar visible para admin con todas las secciones.
- Si el rol es `physio`, las secciones de admin no se ven.
- Cambio de clínica activa funciona si hay más de una.

## Siguiente fase

`2026-06-09-fisio-crm-04-clinic-admin.md` — Gestión de profesionales, salas, servicios y miembros.
