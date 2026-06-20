import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { Sidebar } from "@/components/panel/Sidebar"
import { PanelHeader } from "@/components/panel/PanelHeader"
import { LegalFooter } from "@/components/shared/LegalFooter"

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, active } = await requireActiveClinic()
  const clinicName = active.clinics?.name ?? "Clínica"
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        memberships={memberships}
        activeId={active.clinic_id}
        clinicName={clinicName}
        role={active.role}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <PanelHeader
          email={user.email ?? ""}
          name={(user.user_metadata?.full_name as string | undefined) ?? undefined}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <LegalFooter />
      </div>
    </div>
  )
}
