import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceClient } from "@/lib/supabase/service"
import {
  canPatientCancelAppointment,
  canPatientConfirmAppointment,
  generateAvailableSlots,
  isRequestedSlotAvailable,
  type PortalAppointmentStatus,
} from "@/lib/domain/patient-portal-rules"
import type { Database } from "@/lib/supabase/types"

type Patient = Database["public"]["Tables"]["patients"]["Row"]
type Clinic = Database["public"]["Tables"]["clinics"]["Row"]
type PatientAccount = Database["public"]["Tables"]["patient_accounts"]["Row"]
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"]

export type PortalContext = {
  userId: string
  userEmail: string
  account: PatientAccount
  patient: Patient
  clinic: Clinic
}

export type PortalAppointment = {
  id: string
  starts_at: string
  ends_at: string
  status: PortalAppointmentStatus
  cancel_reason: string | null
  professionals: { display_name: string; color: string } | null
  rooms: { name: string } | null
  service_types: { name: string; duration_minutes: number; color: string } | null
}

export type PortalDocument = {
  id: string
  kind: string
  filename: string
  mime: string
  size_bytes: number
  storage_path: string
  notes: string | null
  uploaded_at: string
}

export async function getPortalContext(): Promise<PortalContext | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user?.email) return null

  const service = createSupabaseServiceClient()
  const existing = await getAccountForUser(service, user.id)
  if (existing) return existing

  const { data: matches, error } = await service
    .from("patients")
    .select("*")
    .eq("email", user.email)
    .eq("is_active", true)
    .is("deleted_at", null)
  if (error) throw error
  if (!matches || matches.length !== 1) return null

  const patient = matches[0]!
  const { error: insertError } = await service.from("patient_accounts").insert({
    clinic_id: patient.clinic_id,
    patient_id: patient.id,
    user_id: user.id,
    accepted_at: new Date().toISOString(),
  })
  if (insertError && !insertError.message.includes("duplicate key")) throw insertError

  return getAccountForUser(service, user.id)
}

export async function getPortalAccountForPatient(patientId: string): Promise<PatientAccount | null> {
  const service = createSupabaseServiceClient()
  const { data, error } = await service
    .from("patient_accounts")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listPortalAppointments(context: PortalContext): Promise<PortalAppointment[]> {
  const service = createSupabaseServiceClient()
  const { data, error } = await service
    .from("appointments")
    .select(`
      id, starts_at, ends_at, status, cancel_reason,
      professionals(display_name, color),
      rooms(name),
      service_types(name, duration_minutes, color)
    `)
    .eq("patient_id", context.patient.id)
    .order("starts_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PortalAppointment[]
}

export async function updatePortalProfile(context: PortalContext, input: {
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
}) {
  const service = createSupabaseServiceClient()
  const { error } = await service
    .from("patients")
    .update(input)
    .eq("id", context.patient.id)
  if (error) throw error
}

export async function confirmPortalAppointment(context: PortalContext, appointmentId: string) {
  const appointment = await getPortalAppointment(context, appointmentId)
  if (!canPatientConfirmAppointment(appointment)) throw new Error("Esta cita no se puede confirmar.")
  const service = createSupabaseServiceClient()
  const { error } = await service
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", appointmentId)
    .eq("patient_id", context.patient.id)
  if (error) throw error
}

export async function cancelPortalAppointment(context: PortalContext, appointmentId: string, reason: string) {
  const appointment = await getPortalAppointment(context, appointmentId)
  if (!canPatientCancelAppointment(appointment)) throw new Error("Esta cita no se puede cancelar desde el portal.")
  const service = createSupabaseServiceClient()
  const { error } = await service
    .from("appointments")
    .update({
      status: "cancelled",
      cancel_reason: reason,
      cancelled_by: context.userId,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("patient_id", context.patient.id)
  if (error) throw error
}

export async function listPortalDocuments(context: PortalContext): Promise<PortalDocument[]> {
  const service = createSupabaseServiceClient()
  const { data, error } = await service
    .from("documents")
    .select("id, kind, filename, mime, size_bytes, storage_path, notes, uploaded_at")
    .eq("patient_id", context.patient.id)
    .order("uploaded_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as PortalDocument[]
}

export async function createPortalDocumentUrl(context: PortalContext, documentId: string): Promise<string> {
  const service = createSupabaseServiceClient()
  const { data: document, error } = await service
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("patient_id", context.patient.id)
    .single()
  if (error) throw error
  const { data, error: urlError } = await service.storage
    .from("patient-documents")
    .createSignedUrl(document.storage_path, 60)
  if (urlError) throw urlError
  return data.signedUrl
}

export async function listPortalBookingOptions(context: PortalContext) {
  const service = createSupabaseServiceClient()
  const [serviceTypes, professionals] = await Promise.all([
    service
      .from("service_types")
      .select("id, name, duration_minutes, color")
      .eq("clinic_id", context.clinic.id)
      .eq("is_active", true)
      .order("name"),
    service
      .from("professionals")
      .select("id, display_name, color")
      .eq("clinic_id", context.clinic.id)
      .eq("is_active", true)
      .order("display_name"),
  ])
  if (serviceTypes.error) throw serviceTypes.error
  if (professionals.error) throw professionals.error
  return {
    serviceTypes: serviceTypes.data ?? [],
    professionals: professionals.data ?? [],
  }
}

export async function listPortalAvailableSlots(context: PortalContext, input: {
  day: string
  serviceTypeId: string
  professionalId: string
}) {
  const service = createSupabaseServiceClient()
  const { data: serviceType, error: serviceTypeError } = await service
    .from("service_types")
    .select("duration_minutes")
    .eq("id", input.serviceTypeId)
    .eq("clinic_id", context.clinic.id)
    .eq("is_active", true)
    .single()
  if (serviceTypeError) throw serviceTypeError

  const { data: professional, error: professionalError } = await service
    .from("professionals")
    .select("id")
    .eq("id", input.professionalId)
    .eq("clinic_id", context.clinic.id)
    .eq("is_active", true)
    .single()
  if (professionalError) throw professionalError

  const dayStart = `${input.day}T00:00:00.000Z`
  const dayEnd = `${input.day}T23:59:59.999Z`
  const { data: existing, error } = await service
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("professional_id", professional.id)
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd)
    .not("status", "in", "(cancelled,no_show)")
  if (error) throw error

  return generateAvailableSlots({
    day: input.day,
    durationMinutes: serviceType.duration_minutes,
    existing: existing ?? [],
  })
}

export async function createPortalAppointment(context: PortalContext, input: {
  serviceTypeId: string
  professionalId: string
  startsAt: string
}) {
  const service = createSupabaseServiceClient()
  const { data: serviceType, error: serviceTypeError } = await service
    .from("service_types")
    .select("id, duration_minutes")
    .eq("id", input.serviceTypeId)
    .eq("clinic_id", context.clinic.id)
    .eq("is_active", true)
    .single()
  if (serviceTypeError) throw serviceTypeError

  const { data: professional, error: professionalError } = await service
    .from("professionals")
    .select("id")
    .eq("id", input.professionalId)
    .eq("clinic_id", context.clinic.id)
    .eq("is_active", true)
    .single()
  if (professionalError) throw professionalError

  const starts = new Date(input.startsAt)
  const availableSlots = await listPortalAvailableSlots(context, {
    day: starts.toISOString().slice(0, 10),
    serviceTypeId: serviceType.id,
    professionalId: professional.id,
  })
  if (!isRequestedSlotAvailable({ startsAt: starts.toISOString(), slots: availableSlots })) {
    throw new Error("Ese hueco ya no esta disponible.")
  }

  const ends = new Date(starts.getTime() + serviceType.duration_minutes * 60_000)
  const payload: AppointmentInsert = {
    clinic_id: context.clinic.id,
    patient_id: context.patient.id,
    professional_id: professional.id,
    service_type_id: serviceType.id,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    status: "scheduled",
    notes_for_reception: "Solicitada desde el portal del paciente",
  }
  const { error } = await service.from("appointments").insert(payload)
  if (error) throw error
}

async function getAccountForUser(
  service: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
): Promise<PortalContext | null> {
  const { data: account, error } = await service
    .from("patient_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle()
  if (error) throw error
  if (!account) return null

  const [{ data: patient, error: patientError }, { data: clinic, error: clinicError }] = await Promise.all([
    service.from("patients").select("*").eq("id", account.patient_id).single(),
    service.from("clinics").select("*").eq("id", account.clinic_id).single(),
  ])
  if (patientError) throw patientError
  if (clinicError) throw clinicError
  return {
    userId,
    userEmail: patient.email ?? "",
    account,
    patient,
    clinic,
  }
}

async function getPortalAppointment(context: PortalContext, appointmentId: string) {
  const service = createSupabaseServiceClient()
  const { data, error } = await service
    .from("appointments")
    .select("id, starts_at, status")
    .eq("id", appointmentId)
    .eq("patient_id", context.patient.id)
    .single()
  if (error) throw error
  return data as { id: string; starts_at: string; status: PortalAppointmentStatus }
}
