import { NextRequest, NextResponse } from "next/server"
import { archiveOrders } from "@/lib/archive-utils"

/**
 * GET /api/cron/archive-orders
 * Archive automatiquement les commandes complètement traitées (livrées ET payées) anciennes.
 * Critères: status='livre' AND payment_status IN ('paid','collected') AND updated_at < cutoff
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.headers.get("authorization")
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const olderThanDays = Number(req.nextUrl.searchParams.get("days") || "14")

    const result = await archiveOrders(olderThanDays)

    return NextResponse.json(result)
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

