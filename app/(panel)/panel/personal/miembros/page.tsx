import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listInvitations, listMembers } from "@/lib/db/members"
import { MembersTable } from "./MembersTable"
import { InvitationsTable } from "./InvitationsTable"
import { InviteDialog } from "./InviteDialog"

export default async function MembersPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const [members, invitations] = await Promise.all([
    listMembers(active.clinic_id),
    listInvitations(active.clinic_id),
  ])
  return (
    <>
      <PageHeader
        title="Miembros e invitaciones"
        description="Personas con acceso a esta clínica."
        actions={<InviteDialog />}
      />
      <div className="space-y-6 p-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Miembros</h2>
          <MembersTable rows={members} />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invitaciones pendientes</h2>
          <InvitationsTable rows={invitations} />
        </section>
      </div>
    </>
  )
}
