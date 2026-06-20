import { notFound } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { AcceptForm } from "./AcceptForm"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc("get_invitation_preview", { p_token: token })
  if (error || !data) notFound()
  // Supabase returns an array for table-returning functions; normalize to a single row.
  const preview = Array.isArray(data) ? data[0] : data
  if (!preview) notFound()

  return (
    <AuthShell title="Aceptar invitación" description={`Te invitan a unirte como ${preview.role}.`}>
      <AcceptForm token={token} email={preview.email} />
    </AuthShell>
  )
}
