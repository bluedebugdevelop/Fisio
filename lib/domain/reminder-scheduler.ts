export type ReminderSlot = { label: "24h" | "2h"; scheduledAt: Date }

const OFFSETS_MINUTES: Record<ReminderSlot["label"], number> = {
  "24h": 24 * 60,
  "2h": 2 * 60,
}

export function computeReminderSchedule({
  startsAt,
  now,
}: {
  startsAt: Date
  now: Date
}): ReminderSlot[] {
  if (startsAt.getTime() <= now.getTime()) return []
  const out: ReminderSlot[] = []
  for (const [label, minutes] of Object.entries(OFFSETS_MINUTES) as [
    ReminderSlot["label"],
    number,
  ][]) {
    const at = new Date(startsAt.getTime() - minutes * 60_000)
    if (at.getTime() > now.getTime()) out.push({ label, scheduledAt: at })
  }
  return out
}
