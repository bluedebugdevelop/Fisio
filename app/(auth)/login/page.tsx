import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { getSession } from "@/lib/auth/session"
import { LoginForm } from "./LoginForm"

export default async function LoginPage() {
  if (await getSession()) redirect("/panel")
  return (
    <AuthShell
      title="Entrar"
      description="Accede al panel de tu clínica."
      footer={
        <div className="flex justify-between">
          <Link className="underline-offset-4 hover:underline" href="/reset">¿Olvidaste tu contraseña?</Link>
          <Link className="underline-offset-4 hover:underline" href="/signup">Crear cuenta</Link>
        </div>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
