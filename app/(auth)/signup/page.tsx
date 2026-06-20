import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { getSession } from "@/lib/auth/session"
import { SignupForm } from "./SignupForm"

export default async function SignupPage() {
  if (await getSession()) redirect("/panel")
  return (
    <AuthShell
      title="Crear cuenta"
      description="Empieza a usar Fisio CRM en tu clínica."
      footer={<>¿Ya tienes cuenta? <Link className="underline" href="/login">Entrar</Link></>}
    >
      <SignupForm />
    </AuthShell>
  )
}
