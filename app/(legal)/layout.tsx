import Link from "next/link"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/panel" className="text-sm text-muted-foreground hover:underline">← Volver</Link>
      <article className="mt-6 space-y-4 text-sm leading-relaxed text-foreground">{children}</article>
    </div>
  )
}
