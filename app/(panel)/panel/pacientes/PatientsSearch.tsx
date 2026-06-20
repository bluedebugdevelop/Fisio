"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

export function PatientsSearch({ initial }: { initial: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [value, setValue] = useState(initial)
  const [, start] = useTransition()

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString())
      if (value) next.set("q", value); else next.delete("q")
      next.delete("page")
      start(() => router.replace(`/panel/pacientes?${next.toString()}`))
    }, 200)
    return () => clearTimeout(t)
  }, [value, router, sp])

  return (
    <Input
      placeholder="Buscar por nombre, email, DNI o teléfono..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="max-w-sm"
    />
  )
}
