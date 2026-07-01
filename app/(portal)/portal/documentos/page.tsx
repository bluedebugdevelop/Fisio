import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/EmptyState"
import { getPortalContext, listPortalDocuments } from "@/lib/db/patient-portal"
import { PortalEmpty } from "../PortalEmpty"

export default async function PortalDocumentsPage() {
  const context = await getPortalContext()
  if (!context) return <PortalEmpty />
  const documents = await listPortalDocuments(context)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Documentos</h1>
        <p className="text-sm text-muted-foreground">Informes y archivos compartidos por tu clínica.</p>
      </div>

      {documents.length === 0 ? (
        <EmptyState title="Sin documentos" description="Cuando tu clínica comparta documentos contigo aparecerán aquí." />
      ) : (
        <div className="grid gap-3">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>{document.filename}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Subido el {new Date(document.uploaded_at).toLocaleString("es-ES")}
                  </p>
                </div>
                <Badge variant="outline">{document.kind}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {document.notes || `${(document.size_bytes / 1024 / 1024).toFixed(2)} MB · ${document.mime}`}
                </p>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/portal/documentos/${document.id}/download`}>Descargar</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
