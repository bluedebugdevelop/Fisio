export function safeRedirectPath(value: FormDataEntryValue | string | null | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  return value
}
