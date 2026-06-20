import { describe, it, expect } from "vitest"
import {
  canTransitionStatus, type AppointmentStatus,
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
