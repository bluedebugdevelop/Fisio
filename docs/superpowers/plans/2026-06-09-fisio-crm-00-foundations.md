# Fisio CRM — Fase 0: Cimientos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Levantar el proyecto Next.js con todas las dependencias, Supabase clients listos, testing configurado y el shell de la app rendereando una página vacía.

**Architecture:** Next.js 16 App Router + TypeScript estricto. Tailwind con preset de shadcn. Supabase clients separados (browser / server / service). Vitest para unit tests, Playwright queda para fases posteriores.

**Tech Stack:** Node ≥ 20, pnpm, Next.js 16, TypeScript 5, Tailwind 4, shadcn/ui, @supabase/ssr, vitest.

---

## Task 0.1: Inicializar el proyecto Next.js

**Files:**
- Create: `package.json` (vía CLI)
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `.gitignore`

- [ ] **Step 1: Crear el proyecto Next.js con la CLI oficial**

Desde `/Users/rubenrubio/Desktop/Fisio/`:

```bash
pnpm dlx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias='@/*' --use-pnpm --no-eslint --no-turbopack
```

Cuando pregunte si sobrescribir archivos (existe `docs/`), aceptar (los specs siguen en `docs/superpowers/`).

- [ ] **Step 2: Limpiar archivos boilerplate**

Borrar el contenido de `app/page.tsx` y reemplazar por:

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Fisio CRM — en construcción</p>
    </main>
  )
}
```

Borrar `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg`.

Reemplazar `app/layout.tsx`:

```tsx
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Fisio CRM",
  description: "Software de gestión para clínicas de fisioterapia",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Arrancar el server y verificar**

```bash
pnpm dev
```

Abrir `http://localhost:3000`. Debe ver el texto "Fisio CRM — en construcción". `Ctrl+C` para parar.

- [ ] **Step 4: Inicializar repo git y commit inicial**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js 16 project"
```

---

## Task 0.2: Endurecer TypeScript

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Activar strict + flags adicionales**

Sobrescribir `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Verificar que compila**

```bash
pnpm tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: enable strict TypeScript with noUncheckedIndexedAccess"
```

---

## Task 0.3: Instalar y configurar shadcn/ui

**Files:**
- Create: `components.json`
- Create: `lib/utils.ts`
- Create: `components/ui/` (varios primitives iniciales)

- [ ] **Step 1: Inicializar shadcn**

```bash
pnpm dlx shadcn@latest init
```

Responder:
- TypeScript: yes
- Base color: `slate`
- CSS variables: yes
- import alias for components: `@/components`
- import alias for utils: `@/lib/utils`

Confirmar que crea `components.json` y `lib/utils.ts`.

- [ ] **Step 2: Aplicar paleta de la spec**

Editar `app/globals.css` para que las variables CSS bajo `:root` y `.dark` reflejen la paleta del documento origen. Reemplazar las definiciones de variables existentes por:

```css
:root {
  --background: 215 40% 98%;        /* #f7f9fc */
  --foreground: 220 24% 14%;        /* #1a1f2b */
  --card: 0 0% 100%;
  --card-foreground: 220 24% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 220 24% 14%;
  --primary: 215 84% 52%;           /* #1f6feb */
  --primary-foreground: 0 0% 100%;
  --secondary: 214 30% 94%;
  --secondary-foreground: 220 24% 14%;
  --muted: 214 30% 94%;
  --muted-foreground: 220 9% 40%;   /* #5b6472 */
  --accent: 215 84% 52%;
  --accent-foreground: 0 0% 100%;
  --destructive: 6 67% 47%;         /* #c0392b */
  --destructive-foreground: 0 0% 100%;
  --success: 154 71% 36%;           /* #1a9c6b */
  --warning: 34 100% 39%;           /* #c77700 */
  --border: 215 24% 91%;            /* #e3e7ee */
  --input: 215 24% 91%;
  --ring: 215 84% 52%;
  --radius: 0.6rem;
}
```

- [ ] **Step 3: Instalar componentes shadcn que usaremos en todas las fases**

```bash
pnpm dlx shadcn@latest add button input label form card dialog dropdown-menu select textarea checkbox table tabs avatar badge separator sheet sonner tooltip popover calendar
```

- [ ] **Step 4: Verificar build**

```bash
pnpm tsc --noEmit
pnpm build
```

Esperado: sin errores.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: install shadcn/ui with Fisio CRM palette"
```

---

## Task 0.4: Instalar dependencias del dominio

**Files:**
- Modify: `package.json` (vía pnpm add)

- [ ] **Step 1: Instalar Supabase, formularios, fechas, validación**

```bash
pnpm add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers date-fns date-fns-tz
```

- [ ] **Step 2: Instalar FullCalendar (para Fase 6)**

```bash
pnpm add @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/resource-timegrid
```

- [ ] **Step 3: Instalar utilities adicionales**

```bash
pnpm add next-safe-action server-only
pnpm add -D @types/node
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add domain dependencies (supabase, zod, rhf, fullcalendar)"
```

---

## Task 0.5: Configurar Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (añadir scripts de test)

- [ ] **Step 1: Instalar Vitest y RTL**

```bash
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["**/*.config.*", "**/.next/**", "tests/**", "supabase/**"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
})
```

Instalar el plugin react:

```bash
pnpm add -D @vitejs/plugin-react
```

- [ ] **Step 3: Crear `tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 4: Añadir scripts al `package.json`**

Editar la sección `scripts` para añadir:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 5: Verificar con un test trivial**

Crear `lib/utils.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("merges classes", () => {
    expect(cn("a", "b")).toBe("a b")
  })
  it("dedupes conflicting tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })
})
```

```bash
pnpm test
```

Esperado: 2 tests pasan.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: configure vitest with RTL"
```

---

## Task 0.6: Variables de entorno y Supabase clients

**Files:**
- Create: `.env.example`
- Create: `.env.local` (no committed)
- Create: `lib/env.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/service.ts`
- Create: `lib/supabase/types.ts` (placeholder, se regenerará en Fase 1)

- [ ] **Step 1: Crear `.env.example`**

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron (para /api/reminders/dispatch)
CRON_SECRET=replace-with-long-random-string

# Resend (opcional para envío real de recordatorios)
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

- [ ] **Step 2: Crear `.env.local` con copia del example**

```bash
cp .env.example .env.local
```

Recordar al usuario: rellenará valores reales después.

- [ ] **Step 3: Crear `lib/env.ts` con validación Zod**

```ts
import { z } from "zod"

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CRON_SECRET: z.string().min(16),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

export const env = (() => {
  if (typeof window === "undefined") {
    return serverSchema.parse(process.env)
  }
  return clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
})()
```

- [ ] **Step 4: Crear `lib/supabase/types.ts` (placeholder)**

```ts
// Será regenerado en Fase 1 vía `pnpm dlx supabase gen types`.
export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
```

- [ ] **Step 5: Crear `lib/supabase/server.ts`**

```ts
import "server-only"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"
import type { Database } from "./types"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(toSet) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Read-only context (RSC); ignore.
          }
        },
      },
    },
  )
}
```

- [ ] **Step 6: Crear `lib/supabase/browser.ts`**

```ts
"use client"
import { createBrowserClient } from "@supabase/ssr"
import { env } from "@/lib/env"
import type { Database } from "./types"

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
```

- [ ] **Step 7: Crear `lib/supabase/service.ts`**

```ts
import "server-only"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import type { Database } from "./types"

/**
 * Service-role client. Saltea RLS. Usar SOLO en endpoints internos:
 * - Cron (/api/reminders/dispatch)
 * - Webhooks
 * - Migraciones server-side
 * Nunca en handlers expuestos al usuario.
 */
export function createSupabaseServiceClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
```

- [ ] **Step 8: Verificar typecheck**

```bash
pnpm typecheck
```

Esperado: sin errores. Si `env` falla por variables vacías en `.env.local`, rellenar con valores dummy temporalmente o usar `pnpm typecheck` sin cargar env (los tipos no necesitan env).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: env validation and Supabase clients (server, browser, service)"
```

---

## Task 0.7: Middleware esqueleto

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Crear middleware con refresh de sesión Supabase**

```ts
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Refresca el token si está cerca de expirar; persiste cookies.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

- [ ] **Step 2: Verificar que arranca sin errores**

```bash
pnpm dev
```

Abrir `http://localhost:3000`. Si las env vars de Supabase no existen aún, fallará. Para evitarlo durante esta fase, rellenar `.env.local` con valores DUMMY válidos por formato (URL y string no vacío). Por ejemplo:

```
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-key
SUPABASE_SERVICE_ROLE_KEY=dummy-service
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=dummy-secret-min-16-chars
```

El middleware intentará hablar con Supabase pero sólo afectará a peticiones con cookies de auth (que aún no existen). La home seguirá cargando.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add Supabase auth middleware"
```

---

## Task 0.8: Estructura base de carpetas

**Files:**
- Create: `app/(auth)/.gitkeep`
- Create: `app/(panel)/.gitkeep`
- Create: `app/api/.gitkeep`
- Create: `components/ui/.gitkeep` (ya existe por shadcn)
- Create: `components/shared/.gitkeep`
- Create: `lib/db/.gitkeep`
- Create: `lib/domain/.gitkeep`
- Create: `lib/audit/.gitkeep`
- Create: `lib/auth/.gitkeep`
- Create: `supabase/migrations/.gitkeep`
- Create: `tests/.gitkeep`

- [ ] **Step 1: Crear carpetas**

```bash
mkdir -p 'app/(auth)' 'app/(panel)' app/api components/shared lib/db lib/domain lib/audit lib/auth supabase/migrations tests
touch 'app/(auth)/.gitkeep' 'app/(panel)/.gitkeep' app/api/.gitkeep components/shared/.gitkeep lib/db/.gitkeep lib/domain/.gitkeep lib/audit/.gitkeep lib/auth/.gitkeep supabase/migrations/.gitkeep tests/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: scaffold project folder structure"
```

---

## Self-check de la fase

Antes de pasar a la siguiente fase, verificar:

```bash
pnpm typecheck && pnpm test && pnpm build
```

Todos deben pasar.

## Siguiente fase

`2026-06-09-fisio-crm-01-database.md` — Migraciones SQL completas, RLS, constraints, seed.
