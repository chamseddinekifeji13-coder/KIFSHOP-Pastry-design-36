import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Server-side API route for password recovery.
 * 
 * This exists because the client-side `resetPasswordForEmail` uses 
 * `window.location.origin` as the redirectTo, which in preview/dev 
 * environments points to the wrong domain (e.g., vusercontent.net).
 * 
 * Supabase ignores redirectTo if the URL is not in the allowed 
 * Redirect URLs list, falling back to just the Site URL (kifshop.tn)
 * without any path or auth code — which breaks the flow.
 * 
 * By handling this server-side, we use the correct production domain
 * from environment variables, ensuring Supabase always gets an 
 * allowed redirect URL.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use the production site URL — NOT window.location.origin
    // This ensures the redirectTo is always an allowed URL in Supabase config
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
      || process.env.VERCEL_PROJECT_PRODUCTION_URL 
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null

    // Build the redirect URL to our callback route
    const redirectTo = siteUrl
      ? `${siteUrl}/auth/callback?next=/auth/reset-password`
      : undefined // Let Supabase use its default Site URL

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      ...(redirectTo ? { redirectTo } : {}),
    })

    if (error) {
      // Don't reveal if the email exists or not (security)
      if (error.message?.includes("not found") || error.message?.includes("User not found")) {
        return NextResponse.json({ success: true })
      }

      if (error.message?.includes("rate") || error.status === 429) {
        return NextResponse.json(
          { error: "Trop de tentatives. Veuillez attendre quelques minutes." },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: error.message || "Erreur lors de l'envoi" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur. Veuillez reessayer." },
      { status: 500 }
    )
  }
}
