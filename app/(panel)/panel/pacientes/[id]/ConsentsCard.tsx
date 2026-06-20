import { grantConsentAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Current = { id: string; kind: string; version: number; title: string; body_markdown: string }
type Granted = {
  id: string; consent_id: string; granted: boolean; granted_at: string; withdrawn_at: string | null
  clinic_consents: { kind: string; version: number; title: string } | null
}

export function ConsentsCard({
  patientId, currentConsents, patientConsents,
}: { patientId: string; currentConsents: Current[]; patientConsents: Granted[] }) {
  const latestByKind = new Map<string, Granted>()
  for (const g of patientConsents) {
    const kind = g.clinic_consents?.kind
    if (!kind) continue
    if (!latestByKind.has(kind)) latestByKind.set(kind, g)
  }
  return (
    <div className="space-y-4">
      {currentConsents.map((c) => {
        const lastGranted = latestByKind.get(c.kind)
        const active = !!lastGranted && lastGranted.granted && !lastGranted.withdrawn_at
        return (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{c.title}
                <Badge className="ml-2" variant="outline">v{c.version}</Badge>
              </CardTitle>
              {active
                ? <Badge variant="secondary">Concedido</Badge>
                : <Badge variant="outline">Pendiente</Badge>}
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{c.body_markdown}</div>
              <form action={grantConsentAction} className="mt-3 flex items-center gap-3">
                <input type="hidden" name="patient_id" value={patientId} />
                <input type="hidden" name="consent_id" value={c.id} />
                {active ? (
                  <Button type="submit" name="granted" value="" variant="outline" size="sm">Retirar consentimiento</Button>
                ) : (
                  <Button type="submit" name="granted" value="on" size="sm">Conceder consentimiento</Button>
                )}
                {lastGranted && (
                  <span className="text-xs text-muted-foreground">
                    Último registro: {new Date(lastGranted.granted_at).toLocaleString("es-ES")}
                  </span>
                )}
              </form>
            </CardContent>
          </Card>
        )
      })}
      {currentConsents.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Esta clínica no tiene consentimientos publicados. Pídele al admin que los publique en Ajustes → Consentimientos.
        </p>
      )}
    </div>
  )
}
