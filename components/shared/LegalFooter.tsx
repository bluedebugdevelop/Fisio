import Link from "next/link"

export function LegalFooter() {
  return (
    <footer className="border-t bg-card px-6 py-4 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-4">
        <span>Fisio CRM</span>
        <Link href="/aviso-legal" className="hover:underline">Aviso legal</Link>
        <Link href="/privacidad" className="hover:underline">Privacidad</Link>
        <span className="ml-auto">Datos en la UE · Cumplimiento RGPD</span>
      </div>
    </footer>
  )
}
