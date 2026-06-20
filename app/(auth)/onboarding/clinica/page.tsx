import { redirect } from "next/navigation"
import { AuthShell } from "@/components/shared/AuthShell"
import { requireSession } from "@/lib/auth/session"
import { getMemberships } from "@/lib/auth/clinic-context"
import { OnboardingForm } from "./OnboardingForm"

export default async function OnboardingPage() {
  await requireSession()
  const memberships = await getMemberships()
  if (memberships.length > 0) redirect("/panel")

  return (
    <AuthShell
      title="Crea tu clínica"
      description="Sólo necesitas el nombre y zona horaria para empezar; el resto se puede completar después."
    >
      <OnboardingForm />
    </AuthShell>
  )
}
