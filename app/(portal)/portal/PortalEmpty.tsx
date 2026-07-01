import Link from "next/link"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"

export function PortalEmpty() {
  return (
    <EmptyState
      title="Tu cuenta no está vinculada a un paciente"
      description="Usa el mismo email que tiene registrado tu clínica. Si ya lo estás usando, pide a recepción que revise tu ficha."
      action={
        <Button asChild variant="outline">
          <Link href="/login">Cambiar de cuenta</Link>
        </Button>
      }
    />
  )
}
