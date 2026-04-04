import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import {
  withSessionAndBody,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/api-helpers"

interface CollectOrderBody {
  orderId: string
  amount: number
  paymentMethod?: string
  notes?: string
}

export async function POST(request: Request) {
  const [data, authOrBodyError] = await withSessionAndBody<CollectOrderBody>(request)
  if (authOrBodyError) return authOrBodyError

  const { session, body } = data
  const orderId = body.orderId?.trim()
  const amount = Number(body.amount)
  const paymentMethod = (body.paymentMethod || "cash").trim()
  const notes = body.notes?.trim() || null

  if (!orderId) {
    return badRequestResponse("orderId manquant")
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return badRequestResponse("Montant invalide")
  }

  try {
    const supabase = createAdminClient()

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total, deposit, payment_status")
      .eq("tenant_id", session.tenantId)
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lecture commande",
          details: orderError.message,
          code: orderError.code,
        },
        { status: 500 }
      )
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Commande introuvable",
        },
        { status: 404 }
      )
    }

    const normalizedPaymentStatus = String(order.payment_status || "").toLowerCase().trim()
    const currentDeposit = Number(order.deposit) || 0
    const totalAmount = Number(order.total) || 0
    const remainingAmount = Math.max(totalAmount - currentDeposit, 0)
    const isAlreadyPaid =
      normalizedPaymentStatus === "paid" ||
      normalizedPaymentStatus === "collected" ||
      remainingAmount <= 0

    if (isAlreadyPaid) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette commande est deja encaissee",
        },
        { status: 409 }
      )
    }

    if (amount > remainingAmount) {
      return badRequestResponse(
        `Montant invalide: reste ${remainingAmount.toFixed(3)} TND a encaisser`
      )
    }

    const { data: activeSession, error: activeSessionError } = await supabase
      .from("cash_sessions")
      .select("id")
      .eq("tenant_id", session.tenantId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeSessionError) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lecture session de caisse",
          details: activeSessionError.message,
          code: activeSessionError.code,
        },
        { status: 500 }
      )
    }

    if (!activeSession) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucune session de caisse active - ouvrez d'abord une session",
        },
        { status: 400 }
      )
    }

    const { data: collection, error: collectionError } = await supabase
      .from("order_collections")
      .insert({
        tenant_id: session.tenantId,
        order_id: orderId,
        cash_session_id: activeSession.id,
        amount,
        payment_method: paymentMethod,
        collected_by: session.activeProfileId,
        collected_by_name: session.displayName,
        collected_at: new Date().toISOString(),
        notes,
      })
      .select()
      .single()

    if (collectionError) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de l'enregistrement du paiement",
          details: collectionError.message || collectionError.details,
          code: collectionError.code,
        },
        { status: 500 }
      )
    }

    // Keep treasury journal in sync: record this collection in transactions.
    const { error: transactionInsertError } = await supabase
      .from("transactions")
      .insert({
        tenant_id: session.tenantId,
        type: "income",
        category: "encaissement-commande",
        amount,
        payment_method: paymentMethod,
        description: `Encaissement commande #${orderId}`,
        order_id: orderId,
        cash_session_id: activeSession.id,
        is_collection: true,
        created_by_name: session.displayName,
        created_at: new Date().toISOString(),
      })

    if (transactionInsertError) {
      // Do not fail the collection response if journal write fails.
      console.error("[collect-order] transaction insert failed:", transactionInsertError)
    }

    // Mark order as paid so it disappears from "to collect" lists.
    const nextDeposit = currentDeposit + amount
    const nextPaymentStatus =
      nextDeposit >= totalAmount
        ? "paid"
        : nextDeposit > 0
          ? "partial"
          : "unpaid"

    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        deposit: nextDeposit,
        payment_status: nextPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", session.tenantId)
      .eq("id", orderId)

    if (orderUpdateError) {
      console.error("[collect-order] order payment_status update failed:", orderUpdateError)
    }

    // Return fresh "today" totals from the same request to avoid client-side flicker.
    const tunisDayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Tunis",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
    const windowStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const [{ data: orderCollections }, { data: paymentCollections }] = await Promise.all([
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

    return NextResponse.json({
      success: true,
      data: collection,
      todayTotals: {
        total: totalOrderCollections + totalPaymentCollections,
        count: orderCollectionsToday.length + paymentCollectionsToday.length,
        date: tunisDayKey,
      },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
