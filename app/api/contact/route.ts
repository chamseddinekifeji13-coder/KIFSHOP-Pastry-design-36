import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Rate limiting per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 3 // max 3 contact messages per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-client-ip") ||
      "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Trop de messages. Reessayez dans une minute." },
        { status: 429 }
      )
    }

    const body = await request.json()
    let { name, phone, email, subject, shop_name, message } = body

    // Validation
    if (!name?.trim() || !phone?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Veuillez remplir tous les champs obligatoires." },
        { status: 400 }
      )
    }

    // Sanitize and limit lengths
    name = name.trim().substring(0, 100)
    phone = phone.trim().substring(0, 20)
    email = email?.trim().substring(0, 100) || null
    subject = subject.trim().substring(0, 50)
    shop_name = shop_name?.trim().substring(0, 100) || null
    message = message.trim().substring(0, 2000)

    const supabase = createAdminClient()

    // Save to contact_messages table
    // If the table doesn't exist, fall back to platform_prospects
    const { error: contactError } = await supabase
      .from("contact_messages")
      .insert({
        name,
        phone,
        email,
        subject,
        shop_name,
        message,
        created_at: new Date().toISOString(),
      })

    if (contactError) {
      // Fallback: save as a platform prospect with contact details in notes
      const { error: prospectError } = await supabase
        .from("platform_prospects")
        .insert({
          business_name: shop_name || `Contact de ${name}`,
          owner_name: name,
          phone,
          source: "contact_form",
          status: "nouveau",
          notes: `[Formulaire Contact]\nSujet: ${subject}\nEmail: ${email || "Non fourni"}\nMessage: ${message}\n\nRecu le ${new Date().toLocaleDateString("fr-TN")}`,
          next_action: "Repondre au message",
          next_action_date: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
        })

      if (prospectError) {
        console.error("Error saving contact message:", prospectError.message)
        return NextResponse.json(
          { error: "Erreur lors de l'enregistrement. Veuillez reessayer." },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Contact form error:", err)
    return NextResponse.json(
      { error: "Erreur serveur. Veuillez reessayer." },
      { status: 500 }
    )
  }
}
