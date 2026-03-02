import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export default async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons\\/.*|offline\\.html|og-image\\.jpg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
