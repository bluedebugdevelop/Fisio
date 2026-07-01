import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getPortalContext } from "@/lib/db/patient-portal"
import { PortalEmpty } from "../PortalEmpty"
import { updatePortalProfileAction } from "./actions"

export default async function PortalProfilePage() {
  const context = await getPortalContext()
  if (!context) return <PortalEmpty />
  const patient = context.patient

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Datos básicos que usa la clínica para contactar contigo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{patient.first_name} {patient.last_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePortalProfileAction} className="grid gap-4 md:grid-cols-2">
            <Field name="phone" label="Teléfono" defaultValue={patient.phone ?? ""} />
            <Field name="email" label="Email" type="email" defaultValue={patient.email ?? ""} />
            <Field name="address" label="Dirección" defaultValue={patient.address ?? ""} className="md:col-span-2" />
            <Field name="city" label="Ciudad" defaultValue={patient.city ?? ""} />
            <Field name="postal_code" label="Código postal" defaultValue={patient.postal_code ?? ""} />
            <div className="md:col-span-2">
              <Button type="submit">Guardar cambios</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  className,
}: {
  name: string
  label: string
  type?: string
  defaultValue: string
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  )
}
