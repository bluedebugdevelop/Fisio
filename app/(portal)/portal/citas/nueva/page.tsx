import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getPortalContext,
  listPortalAvailableSlots,
  listPortalBookingOptions,
} from "@/lib/db/patient-portal"
import { PortalEmpty } from "../../PortalEmpty"
import { createPortalAppointmentAction } from "../actions"

export default async function NewPortalAppointmentPage({
  searchParams,
}: { searchParams: Promise<{ service?: string; professional?: string; day?: string }> }) {
  const context = await getPortalContext()
  if (!context) return <PortalEmpty />
  const sp = await searchParams
  const options = await listPortalBookingOptions(context)
  const selectedService = sp.service ?? options.serviceTypes[0]?.id ?? ""
  const selectedProfessional = sp.professional ?? options.professionals[0]?.id ?? ""
  const selectedDay = sp.day ?? new Date().toISOString().slice(0, 10)
  const slots = selectedService && selectedProfessional
    ? await listPortalAvailableSlots(context, {
        day: selectedDay,
        serviceTypeId: selectedService,
        professionalId: selectedProfessional,
      })
    : []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Solicitar cita</h1>
        <p className="text-sm text-muted-foreground">Elige servicio, profesional y uno de los huecos disponibles.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar huecos</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" method="get">
            <FieldSelect name="service" label="Servicio" value={selectedService}
              options={options.serviceTypes.map((s) => ({ value: s.id, label: `${s.name} (${s.duration_minutes}min)` }))} />
            <FieldSelect name="professional" label="Profesional" value={selectedProfessional}
              options={options.professionals.map((p) => ({ value: p.id, label: p.display_name }))} />
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Día</span>
              <input className="h-9 w-full rounded-md border bg-background px-3" type="date" name="day" defaultValue={selectedDay} />
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="secondary">Ver huecos</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <form key={slot.starts_at} action={createPortalAppointmentAction}>
            <input type="hidden" name="service_type_id" value={selectedService} />
            <input type="hidden" name="professional_id" value={selectedProfessional} />
            <input type="hidden" name="starts_at" value={slot.starts_at} />
            <Button type="submit" variant="outline" className="h-auto w-full justify-start p-4">
              {new Date(slot.starts_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
            </Button>
          </form>
        ))}
      </div>
      {slots.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          No hay huecos para esa combinación. Prueba otro día o profesional.
        </p>
      )}
    </div>
  )
}

function FieldSelect({
  name,
  label,
  value,
  options,
}: {
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} defaultValue={value} className="h-9 w-full rounded-md border bg-background px-3">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}
