# Fisio CRM — Fase 2: Auth y onboarding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Que un nuevo usuario pueda crear cuenta, dar de alta su clínica y entrar al panel autenticado, con políticas RLS funcionando.

**Architecture:** Supabase Auth con email+password. Páginas en route group `(auth)` sin layout del panel. Onboarding ejecuta la función SQL `bootstrap_clinic` (Fase 1) que crea todo en una transacción. Server Actions para forms (no API routes).

**Tech Stack:** `@supabase/ssr`, react-hook-form, zod, next-safe-action, shadcn/ui.

---

## Task 2.1: Layout y estilos del grupo `(auth)`

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `components/shared/AuthShell.tsx`

- [ ] **Step 1: Crear `components/shared/AuthShell.tsx`**

```tsx
import type { ReactNode } from "react"

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-[#0d3b8c] to-[#1f6feb] p-12 text-primary-foreground lg:flex">
        <span className="text-sm font-semibold tracking-wide">FISIO CRM</span>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight">Gestiona tu clínica sin dolores de cabeza.</h1>
          <p className="text-base opacity-90">Agenda, fichas clínicas y recordatorios en un solo sitio.</p>
        </div>
        <span className="text-xs opacity-70">Datos alojados en la UE. Cumplimiento RGPD desde el día 1.</span>
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {children}
          {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Crear `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(auth): auth shell layout"
```

---

## Task 2.2: Helpers de sesión

**Files:**
- Create: `lib/auth/session.ts`
- Create: `lib/auth/clinic-context.ts`
- Create: `lib/auth/guards.ts`

- [ ] **Step 1: `lib/auth/session.ts`**

```ts
import "server-only"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function getSession() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function requireSession() {
  const user = await getSession()
  if (!user) redirect("/login")
  return user
}
```

- [ ] **Step 2: `lib/auth/clinic-context.ts`**

```ts
import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { requireSession } from "./session"

export const ACTIVE_CLINIC_COOKIE = "active_clinic_id"

export async function getMemberships() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clinic_members")
    .select("clinic_id, role, clinics(id, name, timezone)")
    .eq("is_active", true)
  if (error) throw error
  return data ?? []
}

export async function getActiveClinic() {
  const user = await requireSession()
  const memberships = await getMemberships()
  if (memberships.length === 0) return { user, memberships, active: null }

  const jar = await cookies()
  const fromCookie = jar.get(ACTIVE_CLINIC_COOKIE)?.value
  const found = memberships.find((m) => m.clinic_id === fromCookie) ?? memberships[0]
  return { user, memberships, active: found }
}

export async function requireActiveClinic() {
  const ctx = await getActiveClinic()
  if (!ctx.active) redirect("/onboarding/clinica")
  return ctx as typeof ctx & { active: NonNullable<typeof ctx.active> }
}
```

- [ ] **Step 3: `lib/auth/guards.ts`**

```ts
import "server-only"
import { forbidden } from "next/navigation"
import type { Database } from "@/lib/supabase/types"

type Role = Database["public"]["Enums"]["member_role"]

export function ensureRole(role: Role | undefined, allowed: Role[]): asserts role is Role {
  if (!role || !allowed.includes(role)) forbidden()
}
```

`forbidden()` requiere Next 16; si no está disponible, sustituir por `notFound()` o un redirect a `/panel`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): session, clinic context and role guards"
```

---

## Task 2.3: Server actions de auth

**Files:**
- Create: `app/(auth)/actions.ts`

- [ ] **Step 1: Crear actions**

```ts
"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
})

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Indica tu nombre"),
})

const resetSchema = z.object({
  email: z.string().email("Email no válido"),
})

export type ActionState = { error?: string; fieldErrors?: Record<string, string[]> } | null

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: "Email o contraseña incorrectos." }
  revalidatePath("/", "layout")
  redirect("/panel")
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })
  if (error) return { error: error.message }
  redirect("/signup/check-email")
}

export async function resetPasswordRequestAction(
  _prev: ActionState, formData: FormData
): Promise<ActionState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset/confirm`,
  })
  if (error) return { error: error.message }
  redirect("/reset/sent")
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/login")
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(auth): server actions for login, signup, reset, logout"
```

---

## Task 2.4: Página de login

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/login/LoginForm.tsx`

- [ ] **Step 1: `app/(auth)/login/page.tsx`**

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { getSession } from "@/lib/auth/session"
import { LoginForm } from "./LoginForm"

export default async function LoginPage() {
  if (await getSession()) redirect("/panel")
  return (
    <AuthShell
      title="Entrar"
      description="Accede al panel de tu clínica."
      footer={
        <div className="flex justify-between">
          <Link className="underline-offset-4 hover:underline" href="/reset">¿Olvidaste tu contraseña?</Link>
          <Link className="underline-offset-4 hover:underline" href="/signup">Crear cuenta</Link>
        </div>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
```

- [ ] **Step 2: `app/(auth)/login/LoginForm.tsx`**

```tsx
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction, type ActionState } from "../actions"

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, null)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state?.fieldErrors?.email && (
          <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        {state?.fieldErrors?.password && (
          <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
        )}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(auth): login page"
```

---

## Task 2.5: Página de signup + check-email

**Files:**
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/signup/SignupForm.tsx`
- Create: `app/(auth)/signup/check-email/page.tsx`

- [ ] **Step 1: `app/(auth)/signup/page.tsx`**

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { getSession } from "@/lib/auth/session"
import { SignupForm } from "./SignupForm"

export default async function SignupPage() {
  if (await getSession()) redirect("/panel")
  return (
    <AuthShell
      title="Crear cuenta"
      description="Empieza a usar Fisio CRM en tu clínica."
      footer={<>¿Ya tienes cuenta? <Link className="underline" href="/login">Entrar</Link></>}
    >
      <SignupForm />
    </AuthShell>
  )
}
```

- [ ] **Step 2: `app/(auth)/signup/SignupForm.tsx`**

```tsx
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signupAction, type ActionState } from "../actions"

export function SignupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signupAction, null)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre y apellidos</Label>
        <Input id="name" name="name" autoComplete="name" required />
        {state?.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email profesional</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state?.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        {state?.fieldErrors?.password && <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando..." : "Crear cuenta"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Al continuar aceptas la política de privacidad y el aviso legal.
      </p>
    </form>
  )
}
```

- [ ] **Step 3: `app/(auth)/signup/check-email/page.tsx`**

```tsx
import { AuthShell } from "@/components/shared/AuthShell"

export default function CheckEmailPage() {
  return (
    <AuthShell title="Confirma tu email" description="Te hemos enviado un enlace para activar la cuenta.">
      <p className="rounded-md bg-muted p-4 text-sm">
        Revisa tu bandeja de entrada y haz clic en el enlace de confirmación. Si no lo encuentras, mira en spam.
      </p>
    </AuthShell>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): signup page and check-email screen"
```

---

## Task 2.6: Reset de contraseña

**Files:**
- Create: `app/(auth)/reset/page.tsx`
- Create: `app/(auth)/reset/ResetForm.tsx`
- Create: `app/(auth)/reset/sent/page.tsx`
- Create: `app/(auth)/reset/confirm/page.tsx`
- Create: `app/(auth)/reset/confirm/ConfirmForm.tsx`
- Modify: `app/(auth)/actions.ts` (añadir `confirmPasswordResetAction`)

- [ ] **Step 1: Añadir action de confirmación a `app/(auth)/actions.ts`**

Añadir al final del archivo:

```ts
const confirmSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres"),
})

export async function confirmPasswordResetAction(
  _prev: ActionState, formData: FormData
): Promise<ActionState> {
  const parsed = confirmSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }
  redirect("/panel")
}
```

- [ ] **Step 2: `app/(auth)/reset/page.tsx`**

```tsx
import Link from "next/link"
import { AuthShell } from "@/components/shared/AuthShell"
import { ResetForm } from "./ResetForm"

export default function ResetPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Te enviaremos un enlace para crear una nueva."
      footer={<Link className="underline" href="/login">Volver a entrar</Link>}
    >
      <ResetForm />
    </AuthShell>
  )
}
```

- [ ] **Step 3: `app/(auth)/reset/ResetForm.tsx`**

```tsx
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetPasswordRequestAction, type ActionState } from "../actions"

export function ResetForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(resetPasswordRequestAction, null)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state?.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar enlace"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: `app/(auth)/reset/sent/page.tsx`**

```tsx
import { AuthShell } from "@/components/shared/AuthShell"

export default function ResetSentPage() {
  return (
    <AuthShell title="Revisa tu email">
      <p className="text-sm">Si el email existe, te hemos enviado un enlace para restablecer la contraseña.</p>
    </AuthShell>
  )
}
```

- [ ] **Step 5: `app/(auth)/reset/confirm/page.tsx`**

```tsx
import { AuthShell } from "@/components/shared/AuthShell"
import { ConfirmForm } from "./ConfirmForm"

export default function ResetConfirmPage() {
  return (
    <AuthShell title="Nueva contraseña" description="Elige una contraseña nueva para tu cuenta.">
      <ConfirmForm />
    </AuthShell>
  )
}
```

- [ ] **Step 6: `app/(auth)/reset/confirm/ConfirmForm.tsx`**

```tsx
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { confirmPasswordResetAction, type ActionState } from "../../actions"

export function ConfirmForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(confirmPasswordResetAction, null)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña nueva</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        {state?.fieldErrors?.password && <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando..." : "Guardar contraseña"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): password reset (request + confirm)"
```

---

## Task 2.7: Callback de email confirmation

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Crear route handler**

```ts
import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/panel"

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=callback`)
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(auth): email confirmation callback"
```

---

## Task 2.8: Onboarding de clínica

**Files:**
- Create: `app/(auth)/onboarding/clinica/page.tsx`
- Create: `app/(auth)/onboarding/clinica/OnboardingForm.tsx`
- Create: `app/(auth)/onboarding/clinica/actions.ts`

- [ ] **Step 1: `app/(auth)/onboarding/clinica/actions.ts`**

```ts
"use server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ACTIVE_CLINIC_COOKIE } from "@/lib/auth/clinic-context"

const schema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  legal_name: z.string().optional().or(z.literal("")),
  cif: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  timezone: z.string().default("Europe/Madrid"),
})

export type OnboardingState = { error?: string; fieldErrors?: Record<string, string[]> } | null

export async function bootstrapClinicAction(
  _prev: OnboardingState, formData: FormData
): Promise<OnboardingState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const supabase = await createSupabaseServerClient()
  const args = parsed.data
  const { data, error } = await supabase.rpc("bootstrap_clinic", {
    p_name: args.name,
    p_legal_name: args.legal_name || null,
    p_cif: args.cif || null,
    p_address: args.address || null,
    p_city: args.city || null,
    p_postal_code: args.postal_code || null,
    p_phone: args.phone || null,
    p_email: args.email || null,
    p_timezone: args.timezone,
  })
  if (error || !data) return { error: error?.message ?? "No se pudo crear la clínica" }

  const jar = await cookies()
  jar.set(ACTIVE_CLINIC_COOKIE, data, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  })
  redirect("/panel")
}
```

- [ ] **Step 2: `app/(auth)/onboarding/clinica/OnboardingForm.tsx`**

```tsx
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bootstrapClinicAction, type OnboardingState } from "./actions"

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(bootstrapClinicAction, null)
  return (
    <form action={action} className="space-y-4">
      <Field name="name" label="Nombre de la clínica" required state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="legal_name" label="Razón social" state={state} />
        <Field name="cif" label="CIF" state={state} />
      </div>
      <Field name="address" label="Dirección" state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="city" label="Ciudad" state={state} />
        <Field name="postal_code" label="Código postal" state={state} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="phone" label="Teléfono" state={state} />
        <Field name="email" label="Email de contacto" type="email" state={state} />
      </div>
      <input type="hidden" name="timezone" value="Europe/Madrid" />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando clínica..." : "Crear clínica"}
      </Button>
    </form>
  )
}

function Field({
  name, label, type = "text", required, state,
}: {
  name: string; label: string; type?: string; required?: boolean; state: OnboardingState
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={name} name={name} type={type} required={required} />
      {state?.fieldErrors?.[name] && (
        <p className="text-sm text-destructive">{state.fieldErrors[name][0]}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `app/(auth)/onboarding/clinica/page.tsx`**

```tsx
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { requireSession } from "@/lib/auth/session"
import { getMemberships } from "@/lib/auth/clinic-context"
import { OnboardingForm } from "./OnboardingForm"

export default async function OnboardingPage() {
  await requireSession()
  const memberships = await getMemberships()
  if (memberships.length > 0) redirect("/panel")

  return (
    <AuthShell
      title="Crea tu clínica"
      description="Sólo necesitas el nombre y zona horaria para empezar; el resto se puede completar después."
    >
      <OnboardingForm />
    </AuthShell>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): clinic onboarding via bootstrap_clinic RPC"
```

---

## Task 2.9: Página `/panel` placeholder + middleware enforcement

**Files:**
- Create: `app/(panel)/layout.tsx`
- Create: `app/(panel)/panel/page.tsx` (placeholder, se reemplaza en Fase 3)
- Modify: `middleware.ts`

- [ ] **Step 1: Endurecer `middleware.ts` para proteger `/panel`**

Reemplazar `middleware.ts` por:

```ts
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_PATHS = [
  "/login", "/signup", "/reset", "/auth/callback", "/onboarding",
]

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )
  const { data } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  if (!data.user && !isPublic && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

- [ ] **Step 2: `app/(panel)/layout.tsx` (mínimo, Fase 3 lo enriquece)**

```tsx
import { requireActiveClinic } from "@/lib/auth/clinic-context"

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireActiveClinic()
  return <div className="min-h-screen bg-background">{children}</div>
}
```

- [ ] **Step 3: `app/(panel)/panel/page.tsx` placeholder**

```tsx
import { requireActiveClinic } from "@/lib/auth/clinic-context"

export default async function PanelHome() {
  const { active } = await requireActiveClinic()
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-semibold">Bienvenido a {active.clinics?.name}</h1>
      <p className="text-muted-foreground">Panel en construcción.</p>
    </main>
  )
}
```

- [ ] **Step 4: Verificación manual end-to-end**

```bash
pnpm dev
```

1. Ir a `http://localhost:3000/signup`, crear cuenta.
2. Confirmar email en la bandeja.
3. Volver a la app; tras confirmar, redirige a `/panel`.
4. Como no hay clínica, redirige a `/onboarding/clinica`.
5. Rellenar nombre y crear. Debe redirigir a `/panel` con la clínica creada.
6. Cerrar el dev server.

Si algún paso falla, depurar antes de commitear.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): protect /panel and add placeholder page"
```

---

## Task 2.10: Logout

**Files:**
- Create: `components/shared/LogoutButton.tsx`

- [ ] **Step 1: Crear botón**

```tsx
"use client"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/app/(auth)/actions"

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="sm">Salir</Button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(auth): logout button"
```

---

## Self-check de la fase

```bash
pnpm typecheck && pnpm test && pnpm build
```

Manual:
- Signup → email confirm → onboarding → panel funciona end-to-end.
- Cerrar sesión y volver a entrar funciona.
- Visitar `/panel` sin sesión redirige a `/login`.

## Siguiente fase

`2026-06-09-fisio-crm-03-panel.md` — Layout del panel, sidebar y clinic switcher.
