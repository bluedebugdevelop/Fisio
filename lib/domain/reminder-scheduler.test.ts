import { describe, it, expect } from "vitest"
import { computeReminderSchedule } from "./reminder-scheduler"

describe("computeReminderSchedule", () => {
  const startsAt = new Date("2026-06-10T10:00:00Z")
  const now = new Date("2026-06-09T08:00:00Z")

  it("schedules 24h before when far enough in the future", () => {
    const sched = computeReminderSchedule({ startsAt, now })
    const twentyFour = sched.find((s) => s.label === "24h")
    expect(twentyFour?.scheduledAt.toISOString()).toBe("2026-06-09T10:00:00.000Z")
  })

  it("schedules 2h before when far enough", () => {
    const sched = computeReminderSchedule({ startsAt, now })
    const two = sched.find((s) => s.label === "2h")
    expect(two?.scheduledAt.toISOString()).toBe("2026-06-10T08:00:00.000Z")
  })

  it("omits a reminder whose scheduledAt would be in the past", () => {
    const lateNow = new Date("2026-06-10T09:30:00Z")
    const sched = computeReminderSchedule({ startsAt, now: lateNow })
    expect(sched.find((s) => s.label === "24h")).toBeUndefined()
    expect(sched.find((s) => s.label === "2h")).toBeUndefined()
  })

  it("omits reminders for past appointments", () => {
    const sched = computeReminderSchedule({
      startsAt: new Date("2026-06-08T10:00:00Z"),
      now,
    })
    expect(sched).toEqual([])
  })
})
