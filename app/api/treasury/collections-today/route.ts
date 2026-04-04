import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withSession, serverErrorResponse } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const [session, authError] = await withSession()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const tunisDayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Tunis",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())

    const windowStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const [{ data: orderCollections, error: orderCollectionsError }, { data: paymentCollections, error: paymentCollectionsError }] = await Promise.all([
      supabase
        .from("order_collections")
        .select("amount, collected_at")
        .eq("tenant_id", session.tenantId)
        .gte("collected_at", windowStart),
      supabase
        .from("payment_collections")
        .select("amount, collected_at")
        .eq("tenant_id", session.tenantId)
        .gte("collected_at", windowStart),
    ])

    if (orderCollectionsError) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lecture order_collections du jour",
          details: orderCollectionsError.message,
          code: orderCollectionsError.code,
        },
        { status: 500 }
      )
    }

    if (paymentCollectionsError) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lecture payment_collections du jour",
          details: paymentCollectionsError.message,
          code: paymentCollectionsError.code,
        },
        { status: 500 }
      )
    }

    const isTodayInTunis = (value: string | null | undefined): boolean => {
      if (!value) return false
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return false
      const dayKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Tunis",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date)
      return dayKey === tunisDayKey
    }

    const orderCollectionsToday = (orderCollections || []).filter((row) => isTodayInTunis(row.collected_at))
    const paymentCollectionsToday = (paymentCollections || []).filter((row) => isTodayInTunis(row.collected_at))

    const totalOrderCollections = orderCollectionsToday.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    const totalPaymentCollections = paymentCollectionsToday.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    const total = totalOrderCollections + totalPaymentCollections
    const count = orderCollectionsToday.length + paymentCollectionsToday.length

    return NextResponse.json(
      {
        success: true,
        total,
        count,
        date: tunisDayKey,
        generatedAt: new Date().toISOString(),
        breakdown: {
          orderCollections: {
            total: totalOrderCollections,
            count: orderCollectionsToday.length,
          },
          paymentCollections: {
            total: totalPaymentCollections,
            count: paymentCollectionsToday.length,
          },
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}
