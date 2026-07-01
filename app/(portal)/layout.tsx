import Link from "next/link"
import type { ReactNode } from "react"
import { CalendarDays, FileText, Home, UserRound } from "lucide-react"
import { LogoutButton } from "@/components/shared/LogoutButton"

const NAV = [
  { href: "/portal", label: "Inicio", icon: Home },
  { href: "/portal/citas", label: "Citas", icon: CalendarDays },
  { href: "/portal/documentos", label: "Documentos", icon: FileText },
  { href: "/portal/perfil", label: "Perfil", icon: UserRound },
]

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/portal" className="font-semibold">Portal del paciente</Link>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <LogoutButton />
          </div>
        </div>
        <nav className="grid grid-cols-4 border-t sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-2 py-2 text-xs text-muted-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
