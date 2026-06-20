import Link from "next/link"
import { Building2, FileText, Shield } from "lucide-react"
import { PageHeader } from "@/components/panel/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"

const items = [
  {
    href: "/panel/clinica",
    title: "Datos de la clínica",
    description: "Información fiscal y de contacto.",
    icon: Building2,
  },
  {
    href: "/panel/ajustes/consentimientos",
    title: "Consentimientos",
    description: "Textos legales del centro.",
    icon: FileText,
  },
  {
    href: "/panel/ajustes/seguridad",
    title: "Registro de auditoría",
    description: "Quién vio y cambió qué.",
    icon: Shield,
  },
]

export default async function AjustesIndex() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  return (
    <>
      <PageHeader title="Ajustes" description="Configuración avanzada de la clínica." />
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href}>
            <Card className="transition-shadow hover:shadow-md">
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
