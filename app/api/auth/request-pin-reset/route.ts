import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body as { email?: string }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // First, find the auth user by email using admin API
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error("Error listing auth users:", authError)
      return NextResponse.json(
        { success: true, message: "If an account exists, an OTP has been sent" }
      )
    }

    // Find the auth user with matching email
    const authUser = authUsersData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!authUser) {
      // Don't reveal whether user exists for security
      return NextResponse.json(
        { success: true, message: "If an account exists, an OTP has been sent to the email" }
      )
    }

    // Now find the tenant_user associated with this auth user
    const { data: user, error: searchError } = await supabase
      .from("tenant_users")
      .select("id, display_name, user_id")
      .eq("user_id", authUser.id)
      .single()
    
    if (searchError || !user) {
      // Don't reveal whether user exists for security
      return NextResponse.json(
        { success: true, message: "If an account exists, an OTP has been sent to the email" }
      )
    }

    const userEmail = authUser.email

    if (!user || !userEmail) {
      // Don't reveal whether user exists for security
      return NextResponse.json(
        { success: true, message: "If an account exists, an OTP has been sent to the email" }
      )
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store OTP in database
    const { error: updateError } = await supabase
      .from("tenant_users")
      .update({
        pin_reset_otp: otp,
        pin_reset_otp_expires_at: expiresAt.toISOString(),
        pin_reset_requested_at: new Date().toISOString(),
        otp_attempts: 0,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error storing OTP:", updateError)
      return NextResponse.json(
        { error: "Failed to generate recovery code" },
        { status: 500 }
      )
    }

    // For now, we'll log the OTP since email service may not be configured
    // In production, you would send this via email using Resend, SendGrid, etc.
    console.log(`[PIN Recovery] OTP for ${userEmail}: ${otp}`)

    // Return success with tenantUserId for the next step
    return NextResponse.json({
      success: true,
      tenantUserId: user.id,
      message: "Code de recuperation envoye",
    })
  } catch (error) {
    console.error("PIN recovery request error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
