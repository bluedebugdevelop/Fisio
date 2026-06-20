import { describe, it, expect } from "vitest"
import { canWriteSessionNote, type AppointmentStatus } from "./session-rules"

describe("canWriteSessionNote", () => {
  const allowed: AppointmentStatus[] = ["checked_in", "completed"]
  const forbidden: AppointmentStatus[] = ["scheduled", "confirmed", "no_show", "cancelled"]

  it.each(allowed)("permits writing for status %s", (s) => {
    expect(canWriteSessionNote(s, true)).toBe(true)
  })

  it.each(forbidden)("forbids writing for status %s", (s) => {
    expect(canWriteSessionNote(s, true)).toBe(false)
  })

  it("requires treatment consent", () => {
    expect(canWriteSessionNote("completed", false)).toBe(false)
  })
})
