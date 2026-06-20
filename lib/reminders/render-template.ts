export function renderTemplate(
  tpl: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return tpl.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, k) => {
    const v = vars[k]
    return v == null ? "" : String(v)
  })
}
