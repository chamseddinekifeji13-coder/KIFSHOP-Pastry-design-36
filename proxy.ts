// This file exists to satisfy Next.js 16 proxy detection.
// The actual auth logic is in middleware.ts which is still supported.
import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons\\/.*|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
