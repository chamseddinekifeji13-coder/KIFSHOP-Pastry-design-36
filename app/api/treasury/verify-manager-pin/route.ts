import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, pin, requiredRole } = body as { 
      tenantId?: string
      pin?: string
      requiredRole?: string 
    }

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId requis" }, { status: 400 })
    }

    if (!pin) {
      return NextResponse.json({ error: "PIN requis" }, { status: 400 })
    }

    // Verify the caller is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }

    // Verify the authenticated user belongs to this tenant
    const { data: callerProfile } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single()

    if (!callerProfile) {
      return NextResponse.json({ error: "Acces non autorise a ce tenant" }, { status: 403 })
    }

    // Determine which roles can unlock
    const allowedRoles = ["owner"]
    if (requiredRole === "gerant" || !requiredRole) {
      allowedRoles.push("gerant")
    }

    // Fetch all users with manager/owner roles in this tenant
    const { data: managers, error: fetchError } = await supabase
      .from("tenant_users")
      .select("id, display_name, role, pin")
      .eq("tenant_id", tenantId)
      .in("role", allowedRoles)
      .not("pin", "is", null)

    if (fetchError) {
      console.error("Error fetching managers:", fetchError)
      return NextResponse.json({ error: "Erreur lors de la verification" }, { status: 500 })
    }

    if (!managers || managers.length === 0) {
      return NextResponse.json({ 
        error: "Aucun gerant ou proprietaire avec PIN configure" 
      }, { status: 404 })
    }

    // Check if the PIN matches any manager/owner
    const inputPin = String(pin).trim()
    
    const matchedManager = managers.find(m => {
      const storedPin = String(m.pin).trim()
      return storedPin === inputPin
    })

    if (matchedManager) {
      return NextResponse.json({
        success: true,
        verifiedBy: {
          name: matchedManager.display_name,
          role: matchedManager.role
        }
      })
    }

    // No match found
    return NextResponse.json({ 
      error: "Code PIN incorrect" 
    }, { status: 403 })

  } catch (error) {
    console.error("verify-manager-pin error:", error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}
