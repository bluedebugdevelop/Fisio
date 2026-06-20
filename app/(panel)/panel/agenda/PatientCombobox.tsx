"use client"
import { useEffect, useRef, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Input } from "@/components/ui/input"

type Item = { id: string; label: string }

export function PatientCombobox({
  clinicId, value, onChange, initialLabel,
}: {
  clinicId: string
  value: string | null
  onChange: (id: string, label: string) => void
  initialLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(initialLabel ?? "")
  const [items, setItems] = useState<Item[]>([])
  const supabase = useRef(createSupabaseBrowserClient())

  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      const { data } = await supabase.current.rpc("search_patients", {
        p_clinic: clinicId, p_query: query,
      })
      setItems((data ?? []) as Item[])
    }, 150)
    return () => clearTimeout(t)
  }, [query, open, clinicId])

  return (
    <div className="relative">
      <input type="hidden" name="patient_id" value={value ?? ""} />
      <Input
        placeholder="Buscar paciente..."
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && items.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(it.id, it.label)
                  setQuery(it.label)
                  setOpen(false)
                }}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
