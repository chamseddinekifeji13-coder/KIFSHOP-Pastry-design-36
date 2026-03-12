import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Simple in-memory rate limiting per IP (for demo purposes)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 5 // max 5 requests per minute

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
    // ✅ Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-client-ip") || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Trop de demandes. Reessayez plus tard." }, { status: 429 })
    }

    const body = await request.json()
    let { name, phone, business } = body

    // ✅ Input validation and sanitization
    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Nom et telephone requis" }, { status: 400 })
    }

    // ✅ Phone validation (Tunisia format)
    const phoneRegex = /^\+?216?[2-9]\d{7}$/
    const cleanPhone = phone.trim().replace(/\s+/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json({ error: "Numero de telephone invalide" }, { status: 400 })
    }

    // ✅ Length limits to prevent injection
    name = name.trim().substring(0, 100)
    business = business?.trim().substring(0, 100) || `Patisserie de ${name}`

    const supabase = createAdminClient()

    // ✅ Insert into platform_prospects with audit trail
    const { error } = await supabase.from("platform_prospects").insert({
      business_name: business,
      owner_name: name,
      phone: cleanPhone,
      source: "website",
      status: "nouveau",
      notes: `Demande de demo via formulaire web le ${new Date().toLocaleDateString("fr-TN")}`,
      next_action: "Rappeler pour planifier une demo",
      next_action_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) {
      console.error("Error saving demo request:", error.message)
      return NextResponse.json({ error: "Erreur d'enregistrement" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Demo request error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
