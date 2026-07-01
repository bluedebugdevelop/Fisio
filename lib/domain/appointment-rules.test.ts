import { describe, it, expect } from "vitest"
import {
  buildDuplicatedAppointmentDraft,
  canTransitionStatus, type AppointmentStatus,
  getCalendarLoadRange,
  hasOverlap, validateAppointmentTimes,
} from "./appointment-rules"

describe("canTransitionStatus", () => {
  const allowed: [AppointmentStatus, AppointmentStatus[]][] = [
    ["scheduled", ["confirmed", "cancelled", "no_show"]],
    ["confirmed", ["checked_in", "cancelled", "no_show"]],
    ["checked_in", ["completed", "cancelled"]],
    ["completed", []],
    ["cancelled", []],
    ["no_show", []],
  ]
  it.each(allowed)("from %s allows expected transitions", (from, toList) => {
    expect(canTransitionStatus(from, from)).toBe(true)  // idempotent
    for (const to of toList) expect(canTransitionStatus(from, to)).toBe(true)
    const all: AppointmentStatus[] = ["scheduled","confirmed","checked_in","completed","no_show","cancelled"]
    for (const to of all) {
      if (to === from || toList.includes(to)) continue
      expect(canTransitionStatus(from, to)).toBe(false)
    }
  })
})

describe("validateAppointmentTimes", () => {
  it("rejects ends_at <= starts_at", () => {
    expect(() => validateAppointmentTimes(new Date("2026-06-10T10:00:00Z"), new Date("2026-06-10T10:00:00Z")))
      .toThrow(/ends_at/)
  })
  it("rejects duration < 5min", () => {
    expect(() => validateAppointmentTimes(new Date("2026-06-10T10:00:00Z"), new Date("2026-06-10T10:03:00Z")))
      .toThrow(/duración/)
  })
  it("accepts valid range", () => {
    expect(() => validateAppointmentTimes(new Date("2026-06-10T10:00:00Z"), new Date("2026-06-10T11:00:00Z")))
      .not.toThrow()
  })
})

describe("hasOverlap", () => {
  const A = { starts_at: "2026-06-10T10:00:00Z", ends_at: "2026-06-10T11:00:00Z" }
  it("detects pure overlap", () => {
    expect(hasOverlap(A, { starts_at: "2026-06-10T10:30:00Z", ends_at: "2026-06-10T11:30:00Z" })).toBe(true)
  })
  it("detects containment", () => {
    expect(hasOverlap(A, { starts_at: "2026-06-10T10:10:00Z", ends_at: "2026-06-10T10:50:00Z" })).toBe(true)
  })
  it("returns false for touching ranges (half-open [start,end))", () => {
    expect(hasOverlap(A, { starts_at: "2026-06-10T11:00:00Z", ends_at: "2026-06-10T12:00:00Z" })).toBe(false)
    expect(hasOverlap(A, { starts_at: "2026-06-10T09:00:00Z", ends_at: "2026-06-10T10:00:00Z" })).toBe(false)
  })
  it("returns false for disjoint ranges", () => {
    expect(hasOverlap(A, { starts_at: "2026-06-10T12:00:00Z", ends_at: "2026-06-10T13:00:00Z" })).toBe(false)
  })
})

describe("buildDuplicatedAppointmentDraft", () => {
  it("shifts a copied appointment one week later and keeps appointment fields", () => {
    const draft = buildDuplicatedAppointmentDraft({
      patient_id: "patient-1",
      professional_id: "professional-1",
      room_id: "room-1",
      service_type_id: "service-1",
      starts_at: "2026-07-01T08:00:00.000Z",
      ends_at: "2026-07-01T08:45:00.000Z",
      notes_for_reception: "Trae informe",
      patients: { id: "patient-1", first_name: "Ana", last_name: "Lopez" },
      professionals: { id: "professional-1", display_name: "Elena", color: "#1f6feb" },
      rooms: { id: "room-1", name: "Sala 1" },
      service_types: { id: "service-1", name: "Seguimiento", color: "#1f6feb" },
    })

    expect(draft).toMatchObject({
      patient_id: "patient-1",
      professional_id: "professional-1",
      room_id: "room-1",
      service_type_id: "service-1",
      starts_at: "2026-07-08T08:00:00.000Z",
      ends_at: "2026-07-08T08:45:00.000Z",
      notes_for_reception: "Trae informe",
      patients: { first_name: "Ana", last_name: "Lopez" },
    })
  })
})

describe("getCalendarLoadRange", () => {
  const focus = new Date(2026, 6, 15, 12, 0, 0)

  it("loads only the focused day for day views", () => {
    const range = getCalendarLoadRange(focus, "resourceTimeGridDay")
    expect(range.from.getFullYear()).toBe(2026)
    expect(range.from.getMonth()).toBe(6)
    expect(range.from.getDate()).toBe(15)
    expect(range.from.getHours()).toBe(0)
    expect(range.to.getDate()).toBe(16)
    expect(range.to.getHours()).toBe(0)
  })

  it("loads monday-to-monday for week views", () => {
    const range = getCalendarLoadRange(focus, "resourceTimeGridWeek")
    expect(range.from.getDay()).toBe(1)
    expect(range.from.getDate()).toBe(13)
    expect(range.to.getDay()).toBe(1)
    expect(range.to.getDate()).toBe(20)
  })

  it("loads the visible month grid for month view", () => {
    const range = getCalendarLoadRange(focus, "dayGridMonth")
    expect(range.from.getDay()).toBe(1)
    expect(range.from.getDate()).toBe(29)
    expect(range.from.getMonth()).toBe(5)
    expect(range.to.getDay()).toBe(1)
    expect(range.to.getDate()).toBe(3)
    expect(range.to.getMonth()).toBe(7)
  })
})
