import { redirect } from "next/navigation"
import { getPortalContext, createPortalDocumentUrl } from "@/lib/db/patient-portal"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getPortalContext()
  if (!context) redirect("/portal")
  const { id } = await params
  const url = await createPortalDocumentUrl(context, id)
  redirect(url)
}
