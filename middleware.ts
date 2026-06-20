import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_PATHS = [
  "/login", "/signup", "/reset", "/auth/callback", "/onboarding",
]

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )
  const { data } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  if (!data.user && !isPublic && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
