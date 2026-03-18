import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import nodemailer from "nodemailer"

// Configure your email service
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantUserId, email } = body as { tenantUserId?: string; email?: string }

    if (!tenantUserId && !email) {
      return NextResponse.json(
        { error: "tenantUserId or email is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find the tenant user
    let user
    if (tenantUserId) {
      const { data } = await supabase
        .from("tenant_users")
        .select("id, display_name, user_id")
        .eq("id", tenantUserId)
        .single()
      user = data
    } else {
      // Find user by email - get from auth.users table
      const { data: authUsers } = await supabase
        .from("auth.users")
        .select("id")
        .eq("email", email)
        .single()
      
      if (authUsers?.id) {
        const { data } = await supabase
          .from("tenant_users")
          .select("id, display_name, user_id")
          .eq("user_id", authUsers.id)
          .single()
        user = data
      }
    }

    if (!user) {
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

    // Get the user's email
    const { data: authData } = await supabase.auth.admin.getUserById(user.user_id)
    const userEmail = authData?.user?.email

    if (!userEmail) {
      return NextResponse.json(
        { error: "Unable to send recovery email" },
        { status: 500 }
      )
    }

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "KIFSHOP - Code de récupération de PIN",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px;">
          <h2>Réinitialisation de votre code PIN</h2>
          <p>Bonjour ${user.display_name || "utilisateur"},</p>
          <p>Vous avez demandé une réinitialisation de votre code PIN. Utilisez le code ci-dessous :</p>
          <div style="background: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4A7C59; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 12px;">Ce code expire dans 15 minutes.</p>
          <p style="color: #666; font-size: 12px;">Si vous n'avez pas demandé de réinitialisation, veuillez ignorer cet email.</p>
        </div>
      `,
    }

    try {
      await transporter.sendMail(mailOptions)
    } catch (emailError) {
      console.error("Email sending error:", emailError)
      // Don't fail the request, still return success for security
    }

    return NextResponse.json({
      success: true,
      message: "OTP envoyé à votre email",
    })
  } catch (error) {
    console.error("PIN recovery request error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
