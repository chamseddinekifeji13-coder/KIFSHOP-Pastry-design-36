"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

/**
 * This component handles Supabase auth hash fragments that arrive at any page.
 * When Supabase sends a password recovery email, the link points to the Site URL
 * (e.g., https://www.kifshop.tn) with a hash fragment like:
 *   #access_token=...&type=recovery
 *
 * Since hash fragments are never sent to the server, the middleware cannot detect
 * them. This client-side component intercepts the hash and redirects to the
 * correct page (/auth/reset-password) while preserving the hash fragment so
 * the Supabase client can pick up the session.
 */
export function AuthHashHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    // Check if this is a recovery/password reset hash from Supabase
    const isRecovery =
      hash.includes("type=recovery") ||
      hash.includes("type=password_recovery")

    // Only redirect if we're NOT already on the reset password page
    if (isRecovery && pathname !== "/auth/reset-password") {
      // Navigate to reset-password page, preserving the hash fragment
      // We use window.location to ensure the hash fragment is preserved
      window.location.href = `/auth/reset-password${hash}`
    }
  }, [pathname, router])

  return null
}
