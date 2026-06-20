import { SidebarNav } from "./SidebarNav"
import { ClinicSwitcher } from "./ClinicSwitcher"
import type { Database } from "@/lib/supabase/types"

type Role = Database["public"]["Enums"]["member_role"]

export function Sidebar({
  clinicName,
  memberships,
  activeId,
  role,
}: {
  clinicName: string
  memberships: { clinic_id: string; clinics: { id: string; name: string } | null }[]
  activeId: string
  role: Role
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="border-b px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fisio CRM</div>
        <ClinicSwitcher memberships={memberships} activeId={activeId} clinicName={clinicName} />
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav role={role} />
      </div>
    </aside>
  )
}
