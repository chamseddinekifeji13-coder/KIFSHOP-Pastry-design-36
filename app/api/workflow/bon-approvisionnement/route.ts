import { NextRequest, NextResponse } from "next/server"
import { createClient, getTenantIdFromUser } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = await getTenantIdFromUser()

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID not found" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("bon_approvisionnement")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ orders: data || [] }, { status: 200 })
  } catch (error) {
    console.error("[Bon Approvisionnement API Error]", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
