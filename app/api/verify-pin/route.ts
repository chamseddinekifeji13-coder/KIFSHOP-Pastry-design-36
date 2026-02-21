import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { setActiveProfileCookie, clearActiveProfileCookie, type ActiveProfile } from "@/lib/active-profile"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantUserId, pin } = body as { tenantUserId?: string; pin?: string }

    if (!tenantUserId) {
      return NextResponse.json({ error: "tenantUserId requis" }, { status: 400 })
    }

    // 1. Verify the caller is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }

    // 2. Get the caller's tenant to verify they belong to the same tenant
    const { data: callerTenant } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .single()

    if (!callerTenant) {
      return NextResponse.json({ error: "Aucun tenant associe" }, { status: 403 })
    }

    // 3. Fetch the target employee from the same tenant
    const { data: targetUser } = await supabase
      .from("tenant_users")
      .select("id, tenant_id, user_id, role, display_name, pin")
      .eq("id", tenantUserId)
      .eq("tenant_id", callerTenant.tenant_id)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur non trouve dans ce tenant" }, { status: 404 })
    }

    // 4. Verify PIN if the user has one
    if (targetUser.pin) {
      if (!pin) {
        return NextResponse.json({ error: "PIN requis" }, { status: 400 })
      }
      if (pin !== targetUser.pin) {
        return NextResponse.json({ error: "Code PIN incorrect" }, { status: 403 })
      }
    }

    // 5. Set the active profile cookie
    const profile: ActiveProfile = {
      tenantUserId: targetUser.id,
      tenantId: targetUser.tenant_id,
      userId: targetUser.user_id,
      role: targetUser.role,
      displayName: targetUser.display_name || "Utilisateur",
      authUserId: user.id,
      setAt: Date.now(),
    }

    await setActiveProfileCookie(profile)

    return NextResponse.json({
      success: true,
      profile: {
        id: targetUser.user_id,
        name: targetUser.display_name,
        role: targetUser.role,
        dbId: targetUser.id,
      },
    })
  } catch (error) {
    console.error("verify-pin error:", error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

// Clear active profile (lock screen)
export async function DELETE() {
  try {
    await clearActiveProfileCookie()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}
