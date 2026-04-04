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

    // Prevent duplicate collection on the same order.
    const { data: existingCollection, error: existingCollectionError } = await supabase
      .from("order_collections")
      .select("id, collected_at")
      .eq("tenant_id", session.tenantId)
      .eq("order_id", orderId)
      .order("collected_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingCollectionError) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur verification encaissement existant",
          details: existingCollectionError.message,
          code: existingCollectionError.code,
        },
        { status: 500 }
      )
    }

    if (existingCollection) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette commande est deja encaissee",
        },
        { status: 409 }
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

    // Mark order as paid so it disappears from "to collect" lists.
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", session.tenantId)
      .eq("id", orderId)

    if (orderUpdateError) {
      console.error("[collect-order] order payment_status update failed:", orderUpdateError)
    }

    return NextResponse.json({
      success: true,
      data: collection,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
