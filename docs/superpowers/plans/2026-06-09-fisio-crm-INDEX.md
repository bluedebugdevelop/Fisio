# Fisio CRM — Plan de Implementación (Índice Maestro)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement these plans task-by-task.

**Goal:** Implementar el MVP del Software de Gestión para Clínicas de Fisioterapia descrito en `docs/superpowers/specs/2026-06-09-fisio-crm-design.md`.

**Architecture:** SaaS multi-tenant con Next.js 16 (App Router, RSC), Supabase (Postgres + Auth + RLS + Storage), Tailwind + shadcn/ui, desplegado en Vercel. El aislamiento entre clínicas se garantiza vía RLS de Postgres; el dominio se encapsula en `lib/domain/` para testing puro.

**Tech Stack:** Next.js 16 · TypeScript · Tailwind · shadcn/ui · Supabase JS v2 · FullCalendar · Zod · React Hook Form · Vitest · date-fns · Resend (opcional).

---

## Estructura del plan

El MVP se descompone en 10 fases. Cada fase tiene su propio archivo de plan con tareas detalladas (paths exactos, código, tests, commits). Las fases se ejecutan en orden — cada una asume que las anteriores están terminadas.

| # | Fase | Archivo | Resultado al finalizar |
|---|---|---|---|
| 0 | Cimientos: scaffold + dependencias + Supabase clients + testing | `2026-06-09-fisio-crm-00-foundations.md` | Proyecto Next.js arranca, tests verdes, Supabase conectado |
| 1 | Base de datos: migraciones + RLS + constraints + seed | `2026-06-09-fisio-crm-01-database.md` | Schema completo aplicado, RLS verificada con tests SQL |
| 2 | Auth + onboarding de clínica | `2026-06-09-fisio-crm-02-auth.md` | Usuario crea cuenta, da de alta clínica, entra al panel |
| 3 | Layout del panel + clinic switcher | `2026-06-09-fisio-crm-03-panel.md` | Navegación lateral, dashboard, cambio entre clínicas |
| 4 | Gestión de la clínica (admin): fisios, salas, servicios, miembros | `2026-06-09-fisio-crm-04-clinic-admin.md` | Admin puebla recursos de la clínica |
| 5 | Pacientes + consentimientos | `2026-06-09-fisio-crm-05-patients.md` | CRUD de pacientes con consentimientos versionados |
| 6 | Agenda: calendario + citas + estados + anti-solapamiento | `2026-06-09-fisio-crm-06-agenda.md` | Calendario funcional con drag&drop y validaciones |
| 7 | Historia clínica + notas de sesión + documentos | `2026-06-09-fisio-crm-07-clinical.md` | Ficha clínica, SOAP por sesión, upload a Storage |
| 8 | Recordatorios: plantillas + scheduler + dispatch | `2026-06-09-fisio-crm-08-reminders.md` | Recordatorios encolados al crear citas, dispatcher listo |
| 9 | Audit log + RGPD + deploy | `2026-06-09-fisio-crm-09-rgpd-deploy.md` | Audit log activo, anonimización, README, Vercel listo |

## Reglas comunes a todas las fases

- **TDD** en `lib/domain/` (lógica pura): test rojo → implementación → test verde.
- **No TDD estricto** en UI: smoke test con RTL + verificación manual visual.
- **Commits frecuentes**: uno por tarea como mínimo.
- **Idioma**: textos visibles en español. Comentarios e identificadores en inglés.
- **No `any`**: usar tipos generados de Supabase y zod schemas.
- **Server Components por defecto**: marcar `'use client'` solo cuando haga falta.
- **Acceso a datos**: siempre vía `lib/db/<entity>.ts`, nunca llamar `supabase` directo desde componentes.
- **Audit log**: cualquier lectura/escritura de datos clínicos pasa por el wrapper de `lib/audit/`.

## Cómo ejecutar este plan

Recomendado: `superpowers:subagent-driven-development`. Dispatcha una subagent por fase (o por bloque de tareas dentro de una fase). Revisa entre fases.

Alternativa: `superpowers:executing-plans` ejecuta inline con checkpoints.

Empieza por `2026-06-09-fisio-crm-00-foundations.md`.
