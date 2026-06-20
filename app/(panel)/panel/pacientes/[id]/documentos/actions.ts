"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import {
  insertDocumentRow, createDocumentSignedUrl, deleteDocument,
} from "@/lib/db/documents"

const insertSchema = z.object({
  patient_id: z.string().uuid(),
  kind: z.enum(["informe", "prueba_imagen", "consentimiento", "receta", "otro"]),
  filename: z.string().min(1),
  mime: z.string().min(1),
  size_bytes: z.coerce.number().int().min(1),
  storage_path: z.string().min(1),
  notes: z.string().optional().or(z.literal("")),
})

export async function registerDocumentAction(formData: FormData) {
  const { user, active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  const parsed = insertSchema.parse(Object.fromEntries(formData))
  await insertDocumentRow({
    clinic_id: active.clinic_id,
    patient_id: parsed.patient_id,
    kind: parsed.kind,
    filename: parsed.filename,
    mime: parsed.mime,
    size_bytes: parsed.size_bytes,
    storage_path: parsed.storage_path,
    uploaded_by: user.id,
    notes: parsed.notes || null,
  })
  revalidatePath(`/panel/pacientes/${parsed.patient_id}/documentos`)
}

export async function getDownloadUrlAction(storagePath: string): Promise<string> {
  await requireActiveClinic()
  return createDocumentSignedUrl(storagePath)
}

export async function deleteDocumentAction(id: string, storagePath: string, patientId: string) {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin", "physio"])
  await deleteDocument(id, storagePath)
  revalidatePath(`/panel/pacientes/${patientId}/documentos`)
}
