import { createSupabaseServiceClient } from "@/lib/supabase/service"
import { renderTemplate } from "./render-template"
import { env } from "@/lib/env"

type RowToSend = {
  id: string
  channel: "email" | "inapp"
  template_id: string | null
  appointment_id: string
  clinic_id: string
}

// TODO: Las relaciones anidadas (patients/professionals/clinics) del select no
// se infieren bien desde los tipos generados; usamos un cast acotado.
type AppointmentRelated = {
  id: string
  starts_at: string
  patients: { first_name: string | null; last_name: string | null; email: string | null } | null
  professionals: { display_name: string | null } | null
  clinics: { name: string | null } | null
}

export async function dispatchPendingReminders(
  limit = 100,
): Promise<{ processed: number; sent: number; failed: number }> {
  const sb = createSupabaseServiceClient()

  // Selecciona pendientes vencidos
  const { data: pending, error } = await sb
    .from("appointment_reminders")
    .select("id, channel, template_id, appointment_id, clinic_id")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(limit)
  if (error) throw error
  if (!pending || pending.length === 0) return { processed: 0, sent: 0, failed: 0 }

  let sent = 0,
    failed = 0
  for (const r of pending as RowToSend[]) {
    const ok = await sendOne(sb, r).catch(async (e) => {
      await sb
        .from("appointment_reminders")
        .update({
          status: "failed",
          error_message: e instanceof Error ? e.message : String(e),
        })
        .eq("id", r.id)
      return false
    })
    if (ok === true) sent++
    else failed++
  }
  return { processed: pending.length, sent, failed }
}

async function sendOne(
  sb: ReturnType<typeof createSupabaseServiceClient>,
  r: RowToSend,
): Promise<boolean> {
  const { data: apptRaw } = await sb
    .from("appointments")
    .select(`
      id, starts_at,
      patients(first_name, last_name, email),
      professionals(display_name),
      clinics(name)
    `)
    .eq("id", r.appointment_id)
    .single()
  // TODO: cast acotado por relaciones anidadas que no infiere supabase-js
  const appt = apptRaw as unknown as AppointmentRelated | null
  if (!appt) throw new Error("appointment not found")

  let subject = "Recordatorio de cita"
  let body = "Te recordamos tu cita."
  if (r.template_id) {
    const { data: tpl } = await sb
      .from("reminder_templates")
      .select("subject_template, body_template")
      .eq("id", r.template_id)
      .single()
    if (tpl) {
      const dt = new Date(appt.starts_at)
      const vars = {
        patient_first_name: appt.patients?.first_name ?? "",
        appointment_date: dt.toLocaleDateString("es-ES"),
        appointment_time: dt.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        professional_name: appt.professionals?.display_name ?? "",
        clinic_name: appt.clinics?.name ?? "",
      }
      if (tpl.subject_template) subject = renderTemplate(tpl.subject_template, vars)
      body = renderTemplate(tpl.body_template, vars)
    }
  }

  const recipient = appt.patients?.email
  if (!recipient) {
    await sb
      .from("appointment_reminders")
      .update({
        status: "failed",
        error_message: "Sin email del paciente",
      })
      .eq("id", r.id)
    return false
  }

  let providerMessageId: string | null = null
  if (
    r.channel === "email" &&
    env.RESEND_API_KEY &&
    env.RESEND_FROM_EMAIL &&
    env.RESEND_API_KEY !== "" &&
    env.RESEND_FROM_EMAIL !== ""
  ) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [recipient],
        subject,
        text: body,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`resend ${res.status}: ${errText}`)
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string }
    providerMessageId = json.id ?? null
  } else {
    // Modo simulado (sin Resend) — no envía pero registra.
  }

  await sb
    .from("appointment_reminders")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_id: providerMessageId,
      payload_snapshot: { subject, body, to: recipient },
    })
    .eq("id", r.id)
  return true
}
