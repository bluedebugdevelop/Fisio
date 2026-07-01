"use client"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SidebarNav } from "./SidebarNav"
import { ClinicSwitcher } from "./ClinicSwitcher"
import type { Database } from "@/lib/supabase/types"

type Role = Database["public"]["Enums"]["member_role"]

export function MobileNav({
  clinicName,
  memberships,
  activeId,
  role,
}: {
  clinicName: string
  memberships: { clinic_id: string; clinics: { id: string; name: string } | null }[]
  activeId: string
  role: Role
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the drawer whenever the route changes (e.g. after tapping a link).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Abrir menú">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <div className="border-b px-4 py-4">
          <SheetTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fisio CRM
          </SheetTitle>
          <ClinicSwitcher memberships={memberships} activeId={activeId} clinicName={clinicName} />
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav role={role} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
