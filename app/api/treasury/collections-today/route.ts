import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withSession, serverErrorResponse } from "@/lib/api-helpers"

export async function GET() {
  const [session, authError] = await withSession()
  if (authError) return authError

  try {
    const supabase = await createClient()

    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from("order_collections")
      .select("amount")
      .eq("tenant_id", session.tenantId)
      .gte("collected_at", startOfDay.toISOString())
      .lte("collected_at", endOfDay.toISOString())

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lecture encaissements du jour",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    const total = (data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    const count = (data || []).length

    return NextResponse.json({
      success: true,
      total,
      count,
      date: startOfDay.toISOString().slice(0, 10),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
