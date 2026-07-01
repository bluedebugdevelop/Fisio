import { describe, expect, it } from "vitest"
import {
  canPatientCancelAppointment,
  canPatientConfirmAppointment,
  generateAvailableSlots,
  isRequestedSlotAvailable,
} from "./patient-portal-rules"

describe("patient portal appointment actions", () => {
  const now = new Date("2026-07-01T09:00:00.000Z")

  it("allows confirming a future scheduled appointment", () => {
    expect(canPatientConfirmAppointment({
      starts_at: "2026-07-02T10:00:00.000Z",
      status: "scheduled",
    }, now)).toBe(true)
  })

  it("does not allow confirming cancelled, completed or past appointments", () => {
    expect(canPatientConfirmAppointment({
      starts_at: "2026-07-02T10:00:00.000Z",
      status: "cancelled",
    }, now)).toBe(false)
    expect(canPatientConfirmAppointment({
      starts_at: "2026-07-02T10:00:00.000Z",
      status: "completed",
    }, now)).toBe(false)
    expect(canPatientConfirmAppointment({
      starts_at: "2026-06-30T10:00:00.000Z",
      status: "scheduled",
    }, now)).toBe(false)
  })

  it("allows cancelling a future scheduled or confirmed appointment", () => {
    expect(canPatientCancelAppointment({
      starts_at: "2026-07-02T10:00:00.000Z",
      status: "scheduled",
    }, now)).toBe(true)
    expect(canPatientCancelAppointment({
      starts_at: "2026-07-02T10:00:00.000Z",
      status: "confirmed",
    }, now)).toBe(true)
  })

  it("does not allow cancelling past or final appointments", () => {
    expect(canPatientCancelAppointment({
      starts_at: "2026-06-30T10:00:00.000Z",
      status: "confirmed",
    }, now)).toBe(false)
    expect(canPatientCancelAppointment({
      starts_at: "2026-07-02T10:00:00.000Z",
      status: "completed",
    }, now)).toBe(false)
  })
})

describe("isRequestedSlotAvailable", () => {
  it("matches a requested start against the generated slots", () => {
    const slots = [
      { starts_at: "2026-07-01T09:00:00.000Z", ends_at: "2026-07-01T10:00:00.000Z" },
      { starts_at: "2026-07-01T10:00:00.000Z", ends_at: "2026-07-01T11:00:00.000Z" },
    ]

    expect(isRequestedSlotAvailable({ startsAt: "2026-07-01T10:00:00.000Z", slots })).toBe(true)
    expect(isRequestedSlotAvailable({ startsAt: "2026-07-01T10:30:00.000Z", slots })).toBe(false)
  })
})

describe("generateAvailableSlots", () => {
  it("generates half-hour starts inside the working window and skips overlaps", () => {
    const slots = generateAvailableSlots({
      day: "2026-07-01",
      durationMinutes: 60,
      existing: [
        { starts_at: "2026-07-01T09:30:00.000Z", ends_at: "2026-07-01T10:30:00.000Z" },
      ],
      now: new Date("2026-06-30T08:00:00.000Z"),
      workdayStartHour: 9,
      workdayEndHour: 12,
    })

    expect(slots).toEqual([
      { starts_at: "2026-07-01T10:30:00.000Z", ends_at: "2026-07-01T11:30:00.000Z" },
      { starts_at: "2026-07-01T11:00:00.000Z", ends_at: "2026-07-01T12:00:00.000Z" },
    ])
  })

  it("does not return slots in the past", () => {
    const slots = generateAvailableSlots({
      day: "2026-07-01",
      durationMinutes: 45,
      existing: [],
      now: new Date("2026-07-01T10:00:00.000Z"),
      workdayStartHour: 9,
      workdayEndHour: 11,
    })

    expect(slots).toEqual([
      { starts_at: "2026-07-01T10:00:00.000Z", ends_at: "2026-07-01T10:45:00.000Z" },
    ])
  })
})
