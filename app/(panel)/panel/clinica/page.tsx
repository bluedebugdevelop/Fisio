import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ClinicForm } from "./ClinicForm"

export default async function ClinicPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from("clinics").select("*").eq("id", active.clinic_id).single()
  return (
    <>
      <PageHeader title="Datos de la clínica" description="Información fiscal, de contacto y zona horaria." />
      <div className="p-6 max-w-2xl"><ClinicForm initial={data!} /></div>
    </>
  )
}
