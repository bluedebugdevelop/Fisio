import { AuthShell } from "@/components/shared/AuthShell"

export default function ResetSentPage() {
  return (
    <AuthShell title="Revisa tu email">
      <p className="text-sm">Si el email existe, te hemos enviado un enlace para restablecer la contraseña.</p>
    </AuthShell>
  )
}
