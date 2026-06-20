# Fisio CRM — Fase 9: Audit log, RGPD y deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Activar el registro de auditoría en accesos a datos clínicos, exponerlo en un visor para admin, añadir aviso legal/privacidad, y preparar el deploy en Vercel + Supabase.

**Architecture:** Wrapper `lib/audit/` que se invoca en cada lectura/escritura clínica del lado servidor. Visor de logs para admin. README con setup paso a paso.

**Tech Stack:** Postgres functions ya existentes, Next.js, Vercel CLI.

---

## Task 9.1: Helper de audit log

**Files:**
- Create: `lib/audit/log.ts`
- Create: `supabase/migrations/0013_audit_helper.sql`

- [ ] **Step 1: Migración con función para insertar audit log desde authenticated users**

```sql
-- supabase/migrations/0013_audit_helper.sql

create or replace function public.write_audit_log(
  p_action audit_action,
  p_entity_type text,
  p_entity_id uuid default null,
  p_entity_owner_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_clinic uuid;
begin
  if auth.uid() is null then return; end if;
  -- Inferimos clínica activa del usuario si hay solo una; si no, queda null y el insert se hace igualmente.
  select clinic_id into v_clinic
  from clinic_members
  where user_id = auth.uid() and is_active = true
  limit 1;

  insert into audit_logs(clinic_id, actor_user_id, action, entity_type, entity_id, entity_owner_id, metadata)
  values (v_clinic, auth.uid(), p_action, p_entity_type, p_entity_id, p_entity_owner_id, p_metadata);
end;
$$;

grant execute on function public.write_audit_log(audit_action, text, uuid, uuid, jsonb) to authenticated;
```

Aplicar:

```bash
pnpm dlx supabase db push
pnpm db:types
```

- [ ] **Step 2: `lib/audit/log.ts`**

```ts
import "server-only"
import { headers } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

export type AuditAction = Database["public"]["Enums"]["audit_action"]

export async function writeAudit(input: {
  action: AuditAction
  entityType: string
  entityId?: string
  entityOwnerId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createSupabaseServerClient()
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const ua = h.get("user-agent") ?? null
  const metadata = { ...input.metadata, ip, user_agent: ua }
  await supabase.rpc("write_audit_log", {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_entity_owner_id: input.entityOwnerId ?? null,
    p_metadata: metadata,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(audit): write_audit_log helper"
```

---

## Task 9.2: Enganchar audit log en accesos clínicos

**Files:**
- Modify: `lib/db/patients.ts` (audit en `getPatient`)
- Modify: `lib/db/clinical-records.ts` (audit en read/update)
- Modify: `lib/db/session-notes.ts` (audit en list/upsert)
- Modify: `lib/db/documents.ts` (audit en createSignedUrl, insert, delete)

Para cada función de lectura/escritura de datos clínicos, invocar `writeAudit` antes o después de la operación.

- [ ] **Step 1: Patrón a aplicar (ejemplo en `getPatient`)**

Modificar `lib/db/patients.ts`:

```ts
import { writeAudit } from "@/lib/audit/log"

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
  await writeAudit({ action: "view", entityType: "patients", entityId: patientId, entityOwnerId: patientId })
  return data
}
```

- [ ] **Step 2: Aplicar el mismo patrón en**

- `getOrInitClinicalRecord` → `writeAudit({ action: "view", entityType: "clinical_records", entityId: record.id, entityOwnerId: patientId })`
- `updateClinicalRecord` → `writeAudit({ action: "update", entityType: "clinical_records", entityId: id })`
- `listSessionNotes` → `writeAudit({ action: "view", entityType: "session_notes", entityOwnerId: patientId })`
- `upsertSessionNote` → `writeAudit({ action: action === "INSERT" ? "create" : "update", entityType: "session_notes", entityId: input.appointment_id })`
- `insertDocumentRow` → `writeAudit({ action: "create", entityType: "documents", entityId: input.patient_id })`
- `createDocumentSignedUrl` → `writeAudit({ action: "view", entityType: "documents", metadata: { storage_path: storagePath } })`
- `deleteDocument` → `writeAudit({ action: "delete", entityType: "documents", entityId: id })`

- [ ] **Step 3: Verificación manual**

Tras navegar por varias pacientes, comprobar en SQL editor que `audit_logs` tiene filas:

```sql
select action, entity_type, entity_id, metadata, at
from audit_logs
order by at desc limit 20;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(audit): write audit entries on clinical data access"
```

---

## Task 9.3: Visor de audit log

**Files:**
- Create: `app/(panel)/panel/ajustes/seguridad/page.tsx`
- Create: `app/(panel)/panel/ajustes/seguridad/AuditTable.tsx`
- Create: `lib/db/audit.ts`

- [ ] **Step 1: `lib/db/audit.ts`**

```ts
import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceClient } from "@/lib/supabase/service"

export async function listAuditLogs(clinicId: string, limit = 200) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, entity_owner_id, metadata, at, actor_user_id")
    .eq("clinic_id", clinicId)
    .order("at", { ascending: false })
    .limit(limit)
  if (error) throw error

  // Resolver emails de actores en lote
  const actorIds = Array.from(new Set((data ?? []).map((r) => r.actor_user_id).filter(Boolean) as string[]))
  const map = new Map<string, string>()
  if (actorIds.length > 0) {
    const service = createSupabaseServiceClient()
    for (const id of actorIds) {
      const { data: u } = await service.auth.admin.getUserById(id)
      if (u.user?.email) map.set(id, u.user.email)
    }
  }
  return (data ?? []).map((r) => ({ ...r, actor_email: r.actor_user_id ? map.get(r.actor_user_id) ?? "(desconocido)" : "(sistema)" }))
}
```

- [ ] **Step 2: Página**

```tsx
import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listAuditLogs } from "@/lib/db/audit"
import { AuditTable } from "./AuditTable"

export default async function AuditPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const rows = await listAuditLogs(active.clinic_id)
  return (
    <>
      <PageHeader title="Registro de auditoría" description="Accesos y cambios a datos clínicos." />
      <div className="p-6"><AuditTable rows={rows} /></div>
    </>
  )
}
```

- [ ] **Step 3: `AuditTable.tsx`**

```tsx
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"

type Row = {
  id: number; action: string; entity_type: string; entity_id: string | null
  entity_owner_id: string | null; metadata: Record<string, unknown>; at: string
  actor_email: string
}

export function AuditTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows.map((r) => ({ ...r, id: String(r.id) }))}
      empty={{ title: "Sin entradas", description: "Aún no se ha registrado actividad clínica." }}
      columns={[
        { key: "at", header: "Cuándo",
          render: (r) => new Date(r.at).toLocaleString("es-ES") },
        { key: "actor", header: "Usuario", render: (r) => r.actor_email },
        { key: "action", header: "Acción",
          render: (r) => <Badge variant="outline">{r.action}</Badge> },
        { key: "entity", header: "Entidad",
          render: (r) => `${r.entity_type}${r.entity_id ? `#${r.entity_id.slice(0, 8)}` : ""}` },
        { key: "ip", header: "IP",
          render: (r) => (r.metadata as { ip?: string }).ip ?? "—" },
      ]}
    />
  )
}
```

- [ ] **Step 4: Añadir entrada en sidebar de Ajustes**

Si la nav tiene un grupo "Ajustes" plegable, añadir enlace a `/panel/ajustes/seguridad`. Si Ajustes es una página única, añadir cards de enlace en `app/(panel)/panel/ajustes/page.tsx` (similar a `personal/page.tsx`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(audit): admin viewer for audit logs"
```

---

## Task 9.4: Página de Ajustes (índice)

**Files:**
- Modify: `app/(panel)/panel/ajustes/page.tsx`

- [ ] **Step 1: Sustituir el stub por índice de ajustes**

```tsx
import Link from "next/link"
import { Building2, FileText, Shield } from "lucide-react"
import { PageHeader } from "@/components/panel/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"

const items = [
  { href: "/panel/clinica", title: "Datos de la clínica", description: "Información fiscal y de contacto.", icon: Building2 },
  { href: "/panel/ajustes/consentimientos", title: "Consentimientos", description: "Textos legales del centro.", icon: FileText },
  { href: "/panel/ajustes/seguridad", title: "Registro de auditoría", description: "Quién vio y cambió qué.", icon: Shield },
]

export default async function AjustesIndex() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  return (
    <>
      <PageHeader title="Ajustes" description="Configuración avanzada de la clínica." />
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href}>
            <Card className="transition-shadow hover:shadow-md">
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

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(panel): settings index page"
```

---

## Task 9.5: Aviso legal, privacidad y footer

**Files:**
- Create: `app/(legal)/aviso-legal/page.tsx`
- Create: `app/(legal)/privacidad/page.tsx`
- Create: `app/(legal)/layout.tsx`
- Modify: `components/panel/PanelHeader.tsx` o crear `components/shared/LegalFooter.tsx`

- [ ] **Step 1: Layout y páginas legales**

```tsx
// app/(legal)/layout.tsx
import Link from "next/link"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/panel" className="text-sm text-muted-foreground hover:underline">← Volver</Link>
      <article className="prose mt-6">{children}</article>
    </div>
  )
}
```

- [ ] **Step 2: Contenido placeholder editable por la clínica**

```tsx
// app/(legal)/aviso-legal/page.tsx
export default function AvisoLegal() {
  return (
    <>
      <h1>Aviso legal</h1>
      <p>Sustituye este texto por el aviso legal de tu clínica. Debe incluir titular del sitio, datos de contacto y condiciones de uso.</p>
    </>
  )
}
```

```tsx
// app/(legal)/privacidad/page.tsx
export default function Privacidad() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p>Esta política debe explicar qué datos personales y de salud trata la clínica, con qué base legal (art. 9 RGPD), cómo se almacenan (Supabase, UE), cuánto tiempo se conservan y cómo el paciente puede ejercer sus derechos. Sustituye con el texto definitivo asesorado por tu DPO.</p>
    </>
  )
}
```

- [ ] **Step 3: Footer en el panel**

```tsx
// components/shared/LegalFooter.tsx
import Link from "next/link"

export function LegalFooter() {
  return (
    <footer className="border-t bg-card px-6 py-4 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-4">
        <span>Fisio CRM</span>
        <Link href="/aviso-legal" className="hover:underline">Aviso legal</Link>
        <Link href="/privacidad" className="hover:underline">Privacidad</Link>
        <span className="ml-auto">Datos en la UE · Cumplimiento RGPD</span>
      </div>
    </footer>
  )
}
```

Añadir el footer al layout del panel:

```tsx
// app/(panel)/layout.tsx — al final del flex column derecho:
import { LegalFooter } from "@/components/shared/LegalFooter"
// dentro del <div className="flex min-h-screen flex-1 flex-col">:
//   ...
//   <main className="flex-1 overflow-y-auto">{children}</main>
//   <LegalFooter />
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(legal): legal pages and footer"
```

---

## Task 9.6: README de setup y deploy

**Files:**
- Create: `README.md`

- [ ] **Step 1: README completo**

```markdown
# Fisio CRM

Software de gestión multi-tenant para clínicas de fisioterapia. Implementa CRM, historia clínica electrónica, agenda y base para portal del paciente.

## Stack

- **Next.js 16** App Router + TypeScript
- **Supabase** (Postgres + Auth + RLS + Storage)
- **Tailwind CSS** + shadcn/ui
- **FullCalendar** para la agenda
- **Resend** (opcional) para envío de recordatorios

## Requisitos

- Node ≥ 20
- pnpm ≥ 9
- Cuenta en [Supabase](https://supabase.com) (proyecto en región Frankfurt para datos en UE)
- Cuenta en [Vercel](https://vercel.com) para despliegue
- (Opcional) Cuenta en [Resend](https://resend.com) para enviar recordatorios reales

## Setup local

1. **Clona y instala**

   ```bash
   pnpm install
   ```

2. **Crea el proyecto Supabase**

   - Crea proyecto en region **EU (Frankfurt)**.
   - Anota la URL, anon key y service role key.

3. **Variables de entorno**

   ```bash
   cp .env.example .env.local
   ```

   Edita `.env.local` y rellena:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - `CRON_SECRET` (cadena aleatoria ≥ 16 chars, p.ej. `openssl rand -hex 24`)
   - `RESEND_API_KEY` y `RESEND_FROM_EMAIL` (opcionales)

4. **Aplica migraciones**

   ```bash
   pnpm dlx supabase link --project-ref <tu-ref>
   pnpm dlx supabase db push
   pnpm db:types
   ```

5. **Arranca**

   ```bash
   pnpm dev
   ```

   Abre `http://localhost:3000` → crea cuenta → confirma email → onboarding de clínica.

## Tests

```bash
pnpm typecheck   # tipos
pnpm test        # unit (vitest)
pnpm build       # build de producción
```

## Despliegue en Vercel

1. **Importa el repo en Vercel.**
2. **Variables de entorno**: pega las mismas que en `.env.local`, ajustando `NEXT_PUBLIC_APP_URL` al dominio definitivo.
3. **Cron Jobs**: Vercel detecta `vercel.json` y crea el cron de recordatorios (cada 5 min).
4. **Deploy.** Verifica que `/panel` carga, signup funciona y los datos llegan a Supabase.

## Estructura

- `app/` rutas Next (App Router) con grupos `(auth)`, `(panel)`, `(legal)`
- `components/` UI (shadcn primitives + componentes de dominio)
- `lib/` utilidades server-only (`supabase/`, `auth/`, `db/`, `domain/`, `audit/`, `reminders/`)
- `supabase/migrations/` SQL versionado
- `docs/superpowers/` specs y planes

## Decisiones clave

- **Multi-tenant con RLS**: cada `clinic_id` está aislado en BBDD; un usuario puede pertenecer a varias clínicas con roles distintos.
- **Audit log obligatorio** en lecturas/escrituras de datos clínicos.
- **Anti-solapamiento** de citas garantizado con `EXCLUDE` constraint de Postgres.
- **Consentimientos versionados** por clínica; al cambiar el texto se crea una nueva versión.
- **WhatsApp/SMS fuera del MVP** — sólo email.

## Roadmap futuro

- Portal del paciente (login, ver sus citas, chat)
- WhatsApp para recordatorios
- Reserva online
- Facturación y bonos
- App móvil
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with setup and deploy instructions"
```

---

## Task 9.7: Hardening producción

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Headers de seguridad**

```js
// next.config.mjs
const config = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
}

export default config
```

- [ ] **Step 2: Verificar build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "chore(security): security headers in production"
```

---

## Task 9.8: Verificación final del MVP

- [ ] **Step 1: Todo el flujo end-to-end**

Con el dev server corriendo:

1. Signup nuevo usuario en `/signup`.
2. Confirmar email.
3. Crear clínica en onboarding.
4. En `/panel/personal/fisios` crear un fisio (puede ser el propio usuario).
5. En `/panel/personal/salas` añadir una sala.
6. En `/panel/personal/servicios` añadir un tipo de servicio.
7. En `/panel/pacientes/nuevo` crear un paciente con email y consentimientos.
8. En `/panel/agenda` crear una cita drag-selecting.
9. Cambiar el estado de la cita a `checked_in` y luego `completed`.
10. En la ficha del paciente, pestaña **Sesiones**, escribir una nota SOAP.
11. Subir un documento (PDF) en pestaña **Documentos**.
12. En `/panel/recordatorios` verificar que aparecen recordatorios `pending`.
13. Llamar `/api/reminders/dispatch` con el CRON_SECRET; los recordatorios pasan a `sent`.
14. En `/panel/ajustes/seguridad` verificar entradas de audit log.

- [ ] **Step 2: Tag de versión**

```bash
git tag v0.1.0-mvp
```

- [ ] **Step 3: Commit final si hubo correcciones**

```bash
git add -A
git commit -m "chore: MVP verified end-to-end" --allow-empty
```

---

## Self-check de la fase

```bash
pnpm typecheck && pnpm test && pnpm build
```

Manual: flujo end-to-end completo del Task 9.8.

## Fin del plan MVP

El MVP de Fisio CRM está completo. Siguientes pasos sugeridos (fuera del scope de este plan):

1. **Portal del paciente** (login + ver agenda + chat con su fisio).
2. **WhatsApp** vía Twilio o WhatsApp Business API.
3. **Reserva online** por parte del paciente.
4. **Facturación, bonos y pagos.**
5. **Estadísticas** (ocupación, no-shows, revenue).
6. **App móvil** con Expo.
