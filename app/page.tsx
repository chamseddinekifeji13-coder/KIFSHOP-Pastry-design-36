"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Root page that handles ALL Supabase auth redirects:
 *
 * 1. Hash fragments: #access_token=...&type=recovery (implicit flow)
 * 2. Query params: ?code=xxx (PKCE flow fallback)
 * 3. Query params: ?token_hash=xxx&type=recovery (custom email template)
 * 4. Regular auth-based redirects
 *
 * This page MUST be client-side so hash fragments are preserved.
 * The middleware allows "/" through without server-side redirect.
 */
export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const tokenHash = params.get("token_hash")
    const type = params.get("type")

    // 1. Handle token_hash in query params (custom email template approach)
    if (tokenHash && type) {
      window.location.href = `/auth/callback?token_hash=${tokenHash}&type=${type}&next=/auth/reset-password`
      return
    }

    // 2. Handle PKCE code in query params (Supabase redirect fallback)
    if (code) {
      window.location.href = `/auth/callback?code=${code}&next=/auth/reset-password`
      return
    }

    // 3. Handle recovery hash fragments (implicit flow)
    if (hash && (hash.includes("type=recovery") || hash.includes("type=password_recovery"))) {
      window.location.href = `/auth/reset-password${hash}`
      return
    }

    // 4. Handle other auth hash fragments (signup confirmation, etc.)
    if (hash && hash.includes("access_token")) {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const isSuperAdmin = session.user?.user_metadata?.is_super_admin === true
          router.replace(isSuperAdmin ? "/super-admin" : "/dashboard")
        } else {
          router.replace("/auth/login")
        }
      })
      return
    }

    // 5. No auth params - regular redirect based on auth status
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const isSuperAdmin = user.user_metadata?.is_super_admin === true
        router.replace(isSuperAdmin ? "/super-admin" : "/dashboard")
      } else {
        router.replace("/auth/login")
      }
    })
  }, [router])

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  )
}
