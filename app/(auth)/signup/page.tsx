import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { getSession } from "@/lib/auth/session"
import { safeRedirectPath } from "@/lib/auth/redirects"
import { SignupForm } from "./SignupForm"

export default async function SignupPage({
  searchParams,
}: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams
  const next = safeRedirectPath(sp.next, "/panel")
  if (await getSession()) redirect(next)
  return (
    <AuthShell
      title="Crear cuenta"
      description="Empieza a usar Fisio CRM en tu clínica."
      footer={<>¿Ya tienes cuenta? <Link className="underline" href={`/login?next=${encodeURIComponent(next)}`}>Entrar</Link></>}
    >
      <SignupForm next={next} />
    </AuthShell>
  )
}
