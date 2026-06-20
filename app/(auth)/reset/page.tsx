import Link from "next/link"
import { AuthShell } from "@/components/shared/AuthShell"
import { ResetForm } from "./ResetForm"

export default function ResetPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Te enviaremos un enlace para crear una nueva."
      footer={<Link className="underline" href="/login">Volver a entrar</Link>}
    >
      <ResetForm />
    </AuthShell>
  )
}
