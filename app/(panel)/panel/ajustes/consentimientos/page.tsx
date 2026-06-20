import { PageHeader } from "@/components/panel/PageHeader"
import { requireActiveClinic } from "@/lib/auth/clinic-context"
import { ensureRole } from "@/lib/auth/guards"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ConsentForm } from "./ConsentForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const KIND_LABELS: Record<string, string> = {
  tratamiento: "Tratamiento",
  comunicaciones: "Comunicaciones",
  imagen: "Imagen",
  menores: "Menores",
}

export default async function ConsentsPage() {
  const { active } = await requireActiveClinic()
  ensureRole(active.role, ["admin"])
  const supabase = await createSupabaseServerClient()
  const { data: current } = await supabase
    .from("clinic_consents")
    .select("id, kind, version, title, body_markdown, created_at")
    .eq("clinic_id", active.clinic_id)
    .eq("is_current", true)
    .order("kind")

  return (
    <>
      <PageHeader
        title="Consentimientos"
        description="Textos vigentes que firman los pacientes y publicación de nuevas versiones."
      />
      <div className="space-y-6 p-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Versiones vigentes</h2>
          {(!current || current.length === 0) ? (
            <p className="text-sm text-muted-foreground">No hay consentimientos publicados todavía.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {current.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{c.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{KIND_LABELS[c.kind] ?? c.kind}</p>
                    </div>
                    <Badge variant="secondary">v{c.version}</Badge>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {c.body_markdown}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Publicar nueva versión
          </h2>
          <ConsentForm />
        </section>
      </div>
    </>
  )
}
