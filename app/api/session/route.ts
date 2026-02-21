import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/active-profile"

// Returns the current server-verified session (auth + active profile)
// Client components can call this to get a trusted tenantId and role
export async function GET() {
  try {
    const session = await getServerSession()
    return NextResponse.json(session)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Non authentifie" },
      { status: 401 }
    )
  }
}
