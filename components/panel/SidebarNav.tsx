import {
  Calendar, Users, UserCog, Building2, Bell, Settings, LayoutDashboard,
} from "lucide-react"
import { NavLink } from "./NavLink"
import type { Database } from "@/lib/supabase/types"

type Role = Database["public"]["Enums"]["member_role"]

export function SidebarNav({ role }: { role: Role }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      <NavLink href="/panel" icon={<LayoutDashboard className="size-4" />}>Inicio</NavLink>
      <NavLink href="/panel/agenda" icon={<Calendar className="size-4" />}>Agenda</NavLink>
      <NavLink href="/panel/pacientes" icon={<Users className="size-4" />}>Pacientes</NavLink>
      {role === "admin" && (
        <>
          <div className="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administración
          </div>
          <NavLink href="/panel/personal" icon={<UserCog className="size-4" />}>Personal</NavLink>
          <NavLink href="/panel/clinica" icon={<Building2 className="size-4" />}>Clínica</NavLink>
          <NavLink href="/panel/recordatorios" icon={<Bell className="size-4" />}>Recordatorios</NavLink>
          <NavLink href="/panel/ajustes" icon={<Settings className="size-4" />}>Ajustes</NavLink>
        </>
      )}
    </nav>
  )
}
