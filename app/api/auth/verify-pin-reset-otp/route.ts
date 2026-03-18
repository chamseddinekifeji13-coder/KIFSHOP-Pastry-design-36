import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hash } from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantUserId, otp, newPin } = body as {
      tenantUserId?: string
      otp?: string
      newPin?: string
    }

    if (!tenantUserId) {
      return NextResponse.json({ error: "tenantUserId is required" }, { status: 400 })
    }

    if (!otp) {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 })
    }

    if (!newPin || newPin.length < 4) {
      return NextResponse.json(
        { error: "PIN must be at least 4 digits" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the user and verify OTP
    const { data: user, error: getUserError } = await supabase
      .from("tenant_users")
      .select("id, pin_reset_otp, pin_reset_otp_expires_at, otp_attempts")
      .eq("id", tenantUserId)
      .single()

    if (getUserError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if OTP is expired
    if (!user.pin_reset_otp || !user.pin_reset_otp_expires_at) {
      return NextResponse.json({ error: "No OTP request found" }, { status: 400 })
    }

    const expiresAt = new Date(user.pin_reset_otp_expires_at)
    if (expiresAt < new Date()) {
      // Clear expired OTP
      await supabase
        .from("tenant_users")
        .update({ pin_reset_otp: null, pin_reset_otp_expires_at: null })
        .eq("id", tenantUserId)
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 })
    }

    // Check attempts (max 3)
    if ((user.otp_attempts || 0) >= 3) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new OTP" },
        { status: 400 }
      )
    }

    // Verify OTP
    if (user.pin_reset_otp !== otp) {
      const { error: updateError } = await supabase
        .from("tenant_users")
        .update({ otp_attempts: (user.otp_attempts || 0) + 1 })
        .eq("id", tenantUserId)

      const attemptsLeft = 3 - ((user.otp_attempts || 0) + 1)
      return NextResponse.json(
        { error: "Invalid OTP", attemptsLeft },
        { status: 400 }
      )
    }

    // OTP verified - hash the new PIN
    const hashedPin = await hash(newPin, 10)

    // Update PIN and clear OTP
    const { error: updateError } = await supabase
      .from("tenant_users")
      .update({
        pin_hash: hashedPin,
        pin_reset_otp: null,
        pin_reset_otp_expires_at: null,
        pin_reset_requested_at: null,
        otp_attempts: 0,
      })
      .eq("id", tenantUserId)

    if (updateError) {
      console.error("Error updating PIN:", updateError)
      return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "PIN has been successfully reset",
    })
  } catch (error) {
    console.error("PIN reset error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
