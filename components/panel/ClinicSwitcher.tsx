"use client"
import { Check, ChevronsUpDown } from "lucide-react"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setActiveClinicAction } from "@/app/(panel)/actions"

export function ClinicSwitcher({
  memberships, activeId, clinicName,
}: {
  memberships: { clinic_id: string; clinics: { id: string; name: string } | null }[]
  activeId: string
  clinicName: string
}) {
  const [pending, startTransition] = useTransition()
  if (memberships.length <= 1) {
    return <div className="mt-2 text-sm font-semibold">{clinicName}</div>
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="mt-2 w-full justify-between px-2" disabled={pending}>
          <span className="truncate text-left text-sm font-semibold">{clinicName}</span>
          <ChevronsUpDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.clinic_id}
            onSelect={() => startTransition(() => setActiveClinicAction(m.clinic_id))}
          >
            <span className="flex-1 truncate">{m.clinics?.name}</span>
            {m.clinic_id === activeId && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
