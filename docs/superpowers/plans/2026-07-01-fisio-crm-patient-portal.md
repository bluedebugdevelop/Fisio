# Fisio CRM Patient Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authenticated patient portal without chat: profile, appointments, online booking requests, and document downloads.

**Architecture:** Add a `patient_accounts` link between Supabase users and patients. Keep staff permissions in `clinic_members`; expose patient portal data through focused server helpers and actions that always resolve the current `auth.uid()` through `patient_accounts`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase Auth/Postgres/Storage, Vitest, Tailwind/shadcn.

---

## File Structure

- Create `supabase/migrations/0014_patient_portal.sql`: portal account links, RLS, indexes.
- Modify `lib/supabase/types.ts`: add `patient_accounts` and RPC typing.
- Create `lib/domain/patient-portal-rules.ts`: pure rules for appointment actions and available slots.
- Create `lib/domain/patient-portal-rules.test.ts`: tests for portal domain rules.
- Create `lib/db/patient-portal.ts`: current patient account, appointments, documents, profile and booking helpers.
- Create `app/(portal)/layout.tsx`: patient portal shell.
- Create `app/(portal)/portal/page.tsx`: portal home.
- Create `app/(portal)/portal/citas/page.tsx`: appointment list.
- Create `app/(portal)/portal/citas/nueva/page.tsx`: booking form.
- Create `app/(portal)/portal/citas/actions.ts`: confirm, cancel and create appointment actions.
- Create `app/(portal)/portal/documentos/page.tsx`: document list/download actions.
- Create `app/(portal)/portal/perfil/page.tsx`: patient profile form.
- Create `app/(portal)/portal/perfil/actions.ts`: update contact fields.
- Modify `middleware.ts`: protect `/portal` and keep auth routes public.
- Modify patient detail UI/actions: staff can link portal access by patient email.

## Tasks

1. Add database support for patient portal accounts.
2. Add pure domain rules and tests for patient appointment actions and slot generation.
3. Add server data helpers for current patient portal account.
4. Add portal layout and dashboard.
5. Add patient appointment list, confirmation and cancellation.
6. Add patient online booking request flow.
7. Add patient document downloads.
8. Add patient profile editing.
9. Add staff-side portal access linking in patient detail.
10. Run full verification and local browser check.
