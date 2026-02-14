import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  try {
    const { updateSession } = await import("@/lib/supabase/middleware")
    return await updateSession(request)
  } catch (e) {
    console.error("[v0] Middleware import/execution error:", e)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
