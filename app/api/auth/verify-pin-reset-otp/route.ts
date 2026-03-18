import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    // Verify the OTP
    const { data: verifyResult, error: verifyError } = await supabase.rpc(
      "verify_pin_reset_otp",
      { p_tenant_user_id: tenantUserId, p_otp: otp }
    )

    if (verifyError) {
      console.error("Error verifying OTP:", verifyError)
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      )
    }

    if (!verifyResult?.success) {
      return NextResponse.json(
        {
          error: verifyResult?.error || "Invalid OTP",
          attemptsLeft: verifyResult?.attemptsLeft,
        },
        { status: 400 }
      )
    }

    // OTP verified - now reset the PIN
    const { data: resetResult, error: resetError } = await supabase.rpc(
      "reset_pin_after_otp",
      { p_tenant_user_id: tenantUserId, p_new_pin: newPin }
    )

    if (resetError) {
      console.error("Error resetting PIN:", resetError)
      return NextResponse.json(
        { error: "Failed to reset PIN" },
        { status: 500 }
      )
    }

    if (!resetResult?.success) {
      return NextResponse.json(
        { error: resetResult?.error || "Failed to reset PIN" },
        { status: 400 }
      )
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
