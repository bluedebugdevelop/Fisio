"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { safeRedirectPath } from "@/lib/auth/redirects"

const loginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
})

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Indica tu nombre"),
})

const resetSchema = z.object({
  email: z.string().email("Email no válido"),
})

export type ActionState = { error?: string; fieldErrors?: Record<string, string[]> } | null

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: "Email o contraseña incorrectos." }
  revalidatePath("/", "layout")
  redirect(safeRedirectPath(formData.get("next"), "/panel"))
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const next = safeRedirectPath(formData.get("next"), "/panel")
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error) return { error: error.message }
  redirect("/signup/check-email")
}

export async function resetPasswordRequestAction(
  _prev: ActionState, formData: FormData
): Promise<ActionState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset/confirm`,
  })
  if (error) return { error: error.message }
  redirect("/reset/sent")
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/login")
}

const confirmSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres"),
})

export async function confirmPasswordResetAction(
  _prev: ActionState, formData: FormData
): Promise<ActionState> {
  const parsed = confirmSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }
  redirect("/panel")
}
