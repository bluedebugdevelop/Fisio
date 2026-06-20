import { AuthShell } from "@/components/shared/AuthShell"
import { ConfirmForm } from "./ConfirmForm"

export default function ResetConfirmPage() {
  return (
    <AuthShell title="Nueva contraseña" description="Elige una contraseña nueva para tu cuenta.">
      <ConfirmForm />
    </AuthShell>
  )
}
