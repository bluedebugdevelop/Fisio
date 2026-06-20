import Link from "next/link"
import { PageHeader } from "@/components/panel/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCog, DoorOpen, ListChecks, Mail } from "lucide-react"

const items = [
  { href: "/panel/personal/fisios", title: "Fisioterapeutas", description: "Profesionales que atienden.", icon: UserCog },
  { href: "/panel/personal/salas", title: "Salas", description: "Espacios físicos de la clínica.", icon: DoorOpen },
  { href: "/panel/personal/servicios", title: "Tipos de servicio", description: "Sesiones, duraciones y precios.", icon: ListChecks },
  { href: "/panel/personal/miembros", title: "Miembros e invitaciones", description: "Quién accede a la clínica.", icon: Mail },
]

export default function PersonalIndex() {
  return (
    <>
      <PageHeader title="Personal y recursos" description="Configura quién atiende, dónde y con qué tipos de sesión." />
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3">
                <it.icon className="size-5 text-primary" />
                <CardTitle className="text-base">{it.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{it.description}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
