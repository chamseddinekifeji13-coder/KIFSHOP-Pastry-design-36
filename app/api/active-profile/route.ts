import { getServerSession } from "@/lib/active-profile"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({
      tenantUserId: session.activeProfileId,
      tenantId: session.tenantId,
      userId: session.authUserId,
      role: session.activeRole,
      displayName: session.displayName,
    })
  } catch (error) {
    console.error("Error getting active profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
