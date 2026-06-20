import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listRooms } from "@/lib/db/rooms"
import { RoomDialog } from "./RoomDialog"
import { RoomsTable } from "./RoomsTable"

export default async function RoomsPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const rooms = await listRooms(active.clinic_id)
  return (
    <>
      <PageHeader title="Salas" description="Espacios físicos disponibles para citas." actions={<RoomDialog />} />
      <div className="p-6"><RoomsTable rows={rooms} /></div>
    </>
  )
}
