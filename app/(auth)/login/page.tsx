import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { getSession } from "@/lib/auth/session"
import { safeRedirectPath } from "@/lib/auth/redirects"
import { LoginForm } from "./LoginForm"

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams
  const next = safeRedirectPath(sp.next, "/panel")
  if (await getSession()) redirect(next)
  return (
    <AuthShell
      title="Entrar"
      description="Accede al panel de tu clínica."
      footer={
        <div className="flex justify-between">
          <Link className="underline-offset-4 hover:underline" href="/reset">¿Olvidaste tu contraseña?</Link>
          <Link className="underline-offset-4 hover:underline" href={`/signup?next=${encodeURIComponent(next)}`}>Crear cuenta</Link>
        </div>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  )
}
