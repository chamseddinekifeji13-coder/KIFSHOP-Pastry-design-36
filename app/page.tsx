"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Root page that handles:
 * 1. Supabase recovery hash fragments (#access_token=...&type=recovery)
 * 2. Regular redirects based on auth status
 *
 * This page MUST render client-side so hash fragments are preserved.
 * The middleware allows this page through without server-side redirect.
 */
export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash

    // Check for recovery/password reset hash from Supabase
    if (hash && (hash.includes("type=recovery") || hash.includes("type=password_recovery"))) {
      // Redirect to reset-password with hash preserved
      window.location.href = `/auth/reset-password${hash}`
      return
    }

    // Check for other auth hash fragments (signup confirmation, etc.)
    if (hash && hash.includes("access_token")) {
      // Let the Supabase client handle it, then redirect
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

    // No hash fragment - regular redirect based on auth
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
