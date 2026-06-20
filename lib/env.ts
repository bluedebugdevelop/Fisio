import { z } from "zod"

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CRON_SECRET: z.string().min(16),
  RESEND_API_KEY: z.string().optional().or(z.literal("")),
  RESEND_FROM_EMAIL: z.union([z.string().email(), z.literal("")]).optional(),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

type ServerEnv = z.infer<typeof serverSchema>
type ClientEnv = z.infer<typeof clientSchema>

function loadEnv(): ServerEnv {
  if (typeof window === "undefined") {
    return serverSchema.parse(process.env)
  }
  const client: ClientEnv = clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
  // En cliente, los campos server-only son inalcanzables; los rellenamos vacíos
  // para satisfacer el tipo. Cualquier acceso desde código cliente es un bug.
  return {
    ...client,
    SUPABASE_SERVICE_ROLE_KEY: "",
    CRON_SECRET: "",
    RESEND_API_KEY: undefined,
    RESEND_FROM_EMAIL: undefined,
  }
}

export const env: ServerEnv = loadEnv()
