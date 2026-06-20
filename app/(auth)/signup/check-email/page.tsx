import { AuthShell } from "@/components/shared/AuthShell"

export default function CheckEmailPage() {
  return (
    <AuthShell title="Confirma tu email" description="Te hemos enviado un enlace para activar la cuenta.">
      <p className="rounded-md bg-muted p-4 text-sm">
        Revisa tu bandeja de entrada y haz clic en el enlace de confirmación. Si no lo encuentras, mira en spam.
      </p>
    </AuthShell>
  )
}
