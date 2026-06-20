import { type NextRequest, NextResponse } from "next/server"
import { dispatchPendingReminders } from "@/lib/reminders/dispatcher"
import { env } from "@/lib/env"

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const result = await dispatchPendingReminders()
  return NextResponse.json(result)
}

export async function GET(req: NextRequest) {
  return POST(req)
}

export const dynamic = "force-dynamic"
