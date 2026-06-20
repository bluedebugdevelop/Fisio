import type { ReactNode } from "react"

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-[#0d3b8c] to-[#1f6feb] p-12 text-primary-foreground lg:flex">
        <span className="text-sm font-semibold tracking-wide">FISIO CRM</span>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight">Gestiona tu clínica sin dolores de cabeza.</h1>
          <p className="text-base opacity-90">Agenda, fichas clínicas y recordatorios en un solo sitio.</p>
        </div>
        <span className="text-xs opacity-70">Datos alojados en la UE. Cumplimiento RGPD desde el día 1.</span>
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {children}
          {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}
