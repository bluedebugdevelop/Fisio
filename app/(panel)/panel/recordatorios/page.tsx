import { PageHeader } from "@/components/panel/PageHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { listPendingReminders, listTemplates } from "@/lib/db/reminders"
import { RemindersList } from "./RemindersList"
import { TemplatesEditor } from "./TemplatesEditor"

export default async function RecordatoriosPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const [pending, templates] = await Promise.all([
    listPendingReminders(active.clinic_id),
    listTemplates(active.clinic_id),
  ])
  return (
    <>
      <PageHeader title="Recordatorios" description="Cola y plantillas de mensajes." />
      <div className="p-6">
        <Tabs defaultValue="cola">
          <TabsList>
            <TabsTrigger value="cola">Cola</TabsTrigger>
            <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
          </TabsList>
          <TabsContent value="cola" className="pt-4"><RemindersList rows={pending} /></TabsContent>
          <TabsContent value="plantillas" className="pt-4"><TemplatesEditor templates={templates} /></TabsContent>
        </Tabs>
      </div>
    </>
  )
}
