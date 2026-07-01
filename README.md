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
3. **Cron Jobs**: Vercel detecta `vercel.json` y crea el cron de recordatorios (diario). En plan Pro puedes bajarlo a `*/5 * * * *`.
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
