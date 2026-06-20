"use client"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"
import { getDownloadUrlAction, deleteDocumentAction } from "./actions"

type Row = {
  id: string; kind: string; filename: string; mime: string
  size_bytes: number; storage_path: string; notes: string | null; uploaded_at: string
}

export function DocumentsList({ rows, patientId }: { rows: Row[]; patientId: string }) {
  const [pending, start] = useTransition()
  return (
    <DataTable
      rows={rows}
      empty={{ title: "Sin documentos", description: "Sube el primer informe del paciente." }}
      columns={[
        { key: "kind", header: "Tipo", render: (r) => <Badge variant="outline">{r.kind}</Badge> },
        { key: "filename", header: "Archivo", render: (r) => r.filename },
        { key: "size", header: "Tamaño",
          render: (r) => `${(r.size_bytes / 1024 / 1024).toFixed(2)} MB` },
        { key: "date", header: "Subido",
          render: (r) => new Date(r.uploaded_at).toLocaleString("es-ES") },
        { key: "actions", header: "", className: "text-right w-44",
          render: (r) => (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost" size="sm" disabled={pending}
                onClick={() => start(async () => {
                  const url = await getDownloadUrlAction(r.storage_path)
                  window.open(url, "_blank", "noopener,noreferrer")
                })}
              >Descargar</Button>
              <Button
                variant="ghost" size="sm" disabled={pending}
                onClick={() => start(() => deleteDocumentAction(r.id, r.storage_path, patientId))}
              >Borrar</Button>
            </div>
          ) },
      ]}
    />
  )
}
