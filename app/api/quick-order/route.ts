import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { withSession, serverErrorResponse, badRequestResponse } from "@/lib/api-helpers"

export async function POST(request: Request) {
  // Get session with proper error handling
  const [session, authError] = await withSession()
  if (authError) {
    return authError
  }
  
  if (!session) {
    return NextResponse.json({ error: "Session non trouvée" }, { status: 401 })
  }

  try {
    // Use admin client to bypass RLS - we handle authorization via session
    let supabase
    try {
      supabase = createAdminClient()
    } catch (adminError) {
      console.error("Failed to create admin client:", adminError)
      return NextResponse.json(
        { error: "Configuration serveur invalide" },
        { status: 500 }
      )
    }
    
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Corps de requête invalide" },
        { status: 400 }
      )
    }
    const {
      clientId, phone, clientName, amount, itemsDescription, notes,
      source, deliveryType, courier, gouvernorat, shippingCost, deliveryDate, address, truecallerVerified,
      // Offer fields
      orderType, offerBeneficiary, offerReason, discountPercent,
    } = body

    // For offers, amount can be 0 if discount is 100%
    const isOfferType = orderType === "offre_client" || orderType === "offre_personnel"
    if (!phone || typeof amount !== "number" || (!isOfferType && amount <= 0)) {
      return NextResponse.json(
        { error: "Donnees invalides: phone et amount requis" },
        { status: 400 }
      )
    }

    // Check for duplicate orders by phone to prevent accidental double orders
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, created_at")
      .eq("tenant_id", session.tenantId)
      .eq("customer_phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)

    // Check if a recent order (within last 10 minutes) exists for this phone number
    if (recentOrders && recentOrders.length > 0) {
      const lastOrder = recentOrders[0]
      const lastOrderTime = new Date(lastOrder.created_at).getTime()
      const now = new Date().getTime()
      const tenMinutes = 10 * 60 * 1000
      
      if (now - lastOrderTime < tenMinutes) {
        return NextResponse.json({
          error: "Commande recente detectee",
          message: `Une commande pour ${lastOrder.customer_name || "ce client"} (${lastOrder.customer_phone}) a ete creee il y a peu de temps.`
        }, { status: 400 })
      }
    }

    // Verify client exists and is not blacklisted if using client system
    if (clientId) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, status, return_count, tenant_id")
        .eq("id", clientId)
        .eq("tenant_id", session.tenantId)
        .single()

      if (clientError || !client) {
        return NextResponse.json({ error: "Client non trouve" }, { status: 404 })
      }

      // Business rules
      if (client.status === "blacklisted") {
        return NextResponse.json({ error: "Client blackliste. Commande refusee." }, { status: 403 })
      }

      if (client.return_count >= 2) {
        return NextResponse.json({ error: "Trop de retours. Commande bloquee." }, { status: 403 })
      }
    }

    // Calculate final total with discount if it's an offer
    const isOffer = orderType === "offre_client" || orderType === "offre_personnel"
    const discount = isOffer && discountPercent ? (amount * (discountPercent / 100)) : 0
    const finalTotal = isOffer ? amount - discount : amount

    // Prepare base order data (without client_id - orders table doesn't have it)
    const baseOrderData = {
      tenant_id: session.tenantId,
      customer_name: clientName || null,
      customer_address: address || null,
      customer_phone: phone,
      total: finalTotal,
      shipping_cost: shippingCost || 0,
      status: "nouveau",
      delivery_type: deliveryType || "pickup",
      courier: courier || null,
      gouvernorat: gouvernorat || null,
      source: source || "phone",
      delivery_date: deliveryDate || null,
      notes: itemsDescription ? `${itemsDescription}${notes ? ` | ${notes}` : ""}` : (notes || null),
      confirmed_by_name: session.displayName,
      truecaller_verified: truecallerVerified || false,
    }

    // Add offer fields if they exist in the table
    const orderDataWithOffers = {
      ...baseOrderData,
      order_type: orderType || "normal",
      offer_beneficiary: isOffer ? offerBeneficiary : null,
      offer_reason: isOffer ? offerReason : null,
      discount_percent: isOffer ? (discountPercent || 100) : 0,
    }

    // Try to insert with offer fields first
    let { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderDataWithOffers)
      .select()
      .single()

    // If it fails due to missing columns, retry without offer fields
    if (orderError && orderError.message?.includes("column")) {
      const { data: fallbackOrder, error: fallbackError } = await supabase
        .from("orders")
        .insert(baseOrderData)
        .select()
        .single()
      
      if (fallbackError) {
        console.error("Order creation error (fallback):", fallbackError)
        return NextResponse.json({ error: "Erreur creation commande: " + fallbackError.message }, { status: 500 })
      }
      order = fallbackOrder
      orderError = null
    } else if (orderError) {
      console.error("Order creation error:", orderError)
      return NextResponse.json({ error: "Erreur creation commande: " + orderError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
