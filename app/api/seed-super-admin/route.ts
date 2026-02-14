import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/seed-super-admin
 * 
 * One-time bootstrap: creates a super admin user.
 * After first use, remove this file or protect it.
 * 
 * Body: { email, password, display_name }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, display_name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Sign up the super admin with metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          is_super_admin: true,
          display_name: display_name || "Super Admin",
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Super Admin cree avec succes. Verifiez votre email pour confirmer le compte.",
      user_id: data.user?.id,
    })
  } catch (err) {
    console.error("Seed super admin error:", err)
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    )
  }
}
