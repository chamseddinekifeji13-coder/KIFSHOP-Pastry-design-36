"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { DownloadSection } from "@/components/landing/download-section"
import { FooterSection } from "@/components/landing/footer-section"

/**
 * Root page:
 * - Non-authenticated visitors: see the public landing page
 * - Auth hash fragments (#access_token, ?code, ?token_hash): handled and redirected
 * - Authenticated users: proxy.ts redirects to dashboard before this page loads
 */
export default function RootPage() {
  const router = useRouter()
  const [showLanding, setShowLanding] = useState(false)

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
          // No session despite access_token, show landing
          setShowLanding(true)
        }
      })
      return
    }

    // 5. No auth params - show landing page
    // (proxy.ts already redirects authenticated users to dashboard)
    setShowLanding(true)
  }, [router])

  // Still processing auth flow
  if (!showLanding) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  // Public landing page
  return (
    <main>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <DownloadSection />
      <FooterSection />
    </main>
  )
}
