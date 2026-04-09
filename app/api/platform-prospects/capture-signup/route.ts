import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

type SignupCapturePayload = {
  shopName?: string
  displayName?: string
  email?: string
  phone?: string
  city?: string
  businessType?: string
  estimatedDailyOrders?: string
  teamSize?: string
  salesChannels?: string
  acceptedContact?: boolean
  website?: string
  honeyPot?: string
}

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
])

function normalizePhone(value?: string): string {
  return String(value || "").replace(/\s+/g, "").replace(/[^\d+]/g, "")
}

function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1] || ""
  return DISPOSABLE_DOMAINS.has(domain)
}

function computeLeadScore(input: {
  phone: string
  city: string
  businessType: string
  estimatedDailyOrders: string
  acceptedContact: boolean
  disposableEmail: boolean
}): number {
  let score = 0
  if (input.phone.length >= 8) score += 25
  if (input.city) score += 15
  if (input.businessType && input.businessType !== "autre") score += 15
  if (input.estimatedDailyOrders && input.estimatedDailyOrders !== "0-5") score += 20
  if (input.acceptedContact) score += 15
  if (!input.disposableEmail) score += 10
  return Math.min(100, score)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupCapturePayload

    // Simple bot trap: real users never fill hidden fields.
    if ((body.honeyPot || "").trim()) {
      return NextResponse.json({ success: true })
    }

    const shopName = String(body.shopName || "").trim()
    const displayName = String(body.displayName || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const phone = normalizePhone(body.phone)
    const city = String(body.city || "").trim()
    const businessType = String(body.businessType || "").trim()
    const estimatedDailyOrders = String(body.estimatedDailyOrders || "").trim()
    const teamSize = String(body.teamSize || "").trim()
    const salesChannels = String(body.salesChannels || "").trim()
    const acceptedContact = Boolean(body.acceptedContact)
    const website = String(body.website || "").trim()

    if (!shopName || !displayName || !email || !phone || !city) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const disposableEmail = isDisposableEmail(email)
    const leadScore = computeLeadScore({
      phone,
      city,
      businessType,
      estimatedDailyOrders,
      acceptedContact,
      disposableEmail,
    })

    const qualificationSummary = [
      `[Inscription KIFSHOP]`,
      `Type: ${businessType || "-"}`,
      `Cmd/jour estimées: ${estimatedDailyOrders || "-"}`,
      `Equipe: ${teamSize || "-"}`,
      `Canaux: ${salesChannels || "-"}`,
      `Site/Réseau: ${website || "-"}`,
      `Contact commercial autorisé: ${acceptedContact ? "Oui" : "Non"}`,
      `Email jetable: ${disposableEmail ? "Oui" : "Non"}`,
      `Score lead: ${leadScore}/100`,
    ].join("\n")

    const supabase = createAdminClient()

    // Deduplicate by email, then phone.
    let existingId: string | null = null
    const { data: byEmail } = await supabase
      .from("platform_prospects")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle()

    if (byEmail?.id) {
      existingId = byEmail.id
    } else {
      const { data: byPhone } = await supabase
        .from("platform_prospects")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle()
      if (byPhone?.id) existingId = byPhone.id
    }

    if (existingId) {
      const { error: updateError } = await supabase
        .from("platform_prospects")
        .update({
          business_name: shopName,
          owner_name: displayName,
          phone,
          email,
          city,
          source: "direct",
          next_action: "Qualification commerciale",
          next_action_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: qualificationSummary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId)

      if (updateError) {
        console.error("Failed to update signup prospect:", updateError.message)
      }
    } else {
      const { error: insertError } = await supabase
        .from("platform_prospects")
        .insert({
          business_name: shopName,
          owner_name: displayName,
          phone,
          email,
          city,
          source: "direct",
          status: leadScore >= 50 ? "interesse" : "nouveau",
          next_action: "Qualification commerciale",
          next_action_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: qualificationSummary,
        })

      if (insertError) {
        console.error("Failed to insert signup prospect:", insertError.message)
      }
    }

    return NextResponse.json({ success: true, leadScore })
  } catch (error) {
    console.error("capture-signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

