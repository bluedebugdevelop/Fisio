# Fisio CRM MVP Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the current MVP by closing the remaining agenda and operational gaps from the physiotherapy CRM specification.

**Architecture:** Keep the existing Next.js App Router and Supabase/RLS architecture. Add focused domain helpers for testable calendar behavior, then wire them into the existing agenda UI and server actions without changing the database ownership model.

**Tech Stack:** Next.js 16, TypeScript, Supabase, FullCalendar Resource TimeGrid, Tailwind/shadcn, Vitest.

---

## File Structure

- Modify `lib/domain/appointment-rules.ts`: add pure helpers for duplicated appointment drafts and calendar range calculation.
- Modify `lib/domain/appointment-rules.test.ts`: add failing tests first for those helpers.
- Modify `app/(panel)/panel/agenda/page.tsx`: load the correct appointment range for day/week/month/resource views.
- Modify `app/(panel)/panel/agenda/CalendarView.tsx`: enable resource-timegrid views by professional or room, URL-synced navigation, and resource drag/drop.
- Modify `app/(panel)/panel/agenda/AppointmentDialog.tsx`: add duplicate action that opens a prefilled draft.
- Modify `app/(panel)/panel/pacientes/[id]/page.tsx`: replace placeholder clinical tabs with direct operational links.
- Update `docs/superpowers/specs/2026-07-01-fisio-crm-mvp-closeout-design.md`: already created as the approved scope record.

## Task 1: Domain Helpers

- [ ] Write failing tests in `lib/domain/appointment-rules.test.ts` for duplicating a date range one week later and calculating calendar load windows.
- [ ] Run `pnpm test lib/domain/appointment-rules.test.ts` and confirm the new tests fail because helpers do not exist.
- [ ] Implement `buildDuplicatedAppointmentDraft` and `getCalendarLoadRange` in `lib/domain/appointment-rules.ts`.
- [ ] Run `pnpm test lib/domain/appointment-rules.test.ts` and confirm it passes.

## Task 2: Agenda Resource Views

- [ ] Import `@fullcalendar/resource-timegrid` in `CalendarView`.
- [ ] Add `resourceTimeGridDay` and `resourceTimeGridWeek` views.
- [ ] Build resources from active professionals or active rooms, controlled by a `resource` query param.
- [ ] Assign event `resourceId` from `professional_id` or `room_id`.
- [ ] On resource drag/drop, update `professional_id` or `room_id` through `moveAppointmentAction`.
- [ ] Sync `date`, `view`, and `resource` query params so navigation loads the right server range.

## Task 3: Agenda Range Loading

- [ ] Use `getCalendarLoadRange` in `app/(panel)/panel/agenda/page.tsx`.
- [ ] Respect the current FullCalendar view from `searchParams.view`.
- [ ] Keep professional filtering working with the existing `professional` query param.

## Task 4: Duplicate Appointment

- [ ] Add a duplicate button in the edit dialog.
- [ ] Use `buildDuplicatedAppointmentDraft` so the duplicated draft keeps patient, professional, room, service type and reception notes, but shifts the time one week later.
- [ ] Open the create dialog instead of immediately inserting, so staff can adjust the slot and avoid accidental overlap.

## Task 5: Patient MVP Navigation

- [ ] Replace placeholder tab panels for historia, sesiones and documentos with proper link actions.
- [ ] Keep role restrictions in the destination pages; do not expose clinical content inline to reception.

## Task 6: Verification

- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Start the dev server and visually check the agenda if the local environment has Supabase credentials.
