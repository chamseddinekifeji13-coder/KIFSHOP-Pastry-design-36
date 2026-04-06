import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/cron/archive-orders
 * Archive automatiquement les commandes terminees (livre/annule) anciennes.
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.headers.get("authorization")
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const olderThanDays = Number(req.nextUrl.searchParams.get("days") || "14")
    const safeDays = Number.isFinite(olderThanDays) ? Math.max(1, Math.floor(olderThanDays)) : 14
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString()

    const supabase = createAdminClient()

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id")

    if (tenantsError) {
      return NextResponse.json(
        { success: false, error: `Erreur lecture tenants: ${tenantsError.message}` },
        { status: 500 },
      )
    }

    let archivedTotal = 0
    const details: Array<{ tenantId: string; archived: number }> = []

    for (const t of tenants || []) {
      const tenantId = String((t as { id: string }).id || "")
      if (!tenantId) continue

      const { data: rows, error: listError } = await supabase
        .from("orders")
        .select("id")
        .eq("tenant_id", tenantId)
        .in("status", ["livre", "annule"])
        .lte("updated_at", cutoff)
        .or("is_archived.is.null,is_archived.eq.false")

      if (listError) {
        details.push({ tenantId, archived: 0 })
        continue
      }

      const ids = (rows || []).map((r: any) => r.id).filter(Boolean)
      if (ids.length === 0) {
        details.push({ tenantId, archived: 0 })
        continue
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .in("id", ids)

      if (updateError) {
        details.push({ tenantId, archived: 0 })
        continue
      }

      archivedTotal += ids.length
      details.push({ tenantId, archived: ids.length })
    }

    return NextResponse.json({
      success: true,
      olderThanDays: safeDays,
      archived: archivedTotal,
      details,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron job failed",
      },
      { status: 500 },
    )
  }
}

