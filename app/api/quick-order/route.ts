import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { withSession, serverErrorResponse, badRequestResponse } from "@/lib/api-helpers"

export async function POST(request: Request) {
  try {
    console.log("[v0] quick-order POST - start")
    
    // Get session with proper error handling
    const [session, authError] = await withSession()
    console.log("[v0] withSession result:", { hasSession: !!session, hasError: !!authError })
    
    if (authError) {
      console.log("[v0] Session auth error - returning")
      return authError
    }
    
    console.log("[v0] Session:", { tenantId: session.tenantId, userId: session.authUserId })

    // Use admin client to bypass RLS - we handle authorization via session
    console.log("[v0] Creating admin client...")
    const supabase = createAdminClient()
    console.log("[v0] Admin client created successfully")
    
    const body = await request.json()
    console.log("[v0] Request body parsed:", JSON.stringify(body, null, 2))
    const {
      clientId, phone, clientName, amount, itemsDescription, notes,
      source, deliveryType, courier, gouvernorat, shippingCost, deliveryDate, address, truecallerVerified,
      // Offer fields
      orderType, offerBeneficiary, offerReason, discountPercent,
    } = body

    // For offers, amount can be 0 if discount is 100%
    const isOfferType = orderType === "offre_client" || orderType === "offre_personnel"
    if (!clientId || !phone || typeof amount !== "number" || (!isOfferType && amount <= 0)) {
      return NextResponse.json(
        { error: "Donnees invalides: clientId, phone et amount requis" },
        { status: 400 }
      )
    }

    // Verify client exists and belongs to this tenant
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

    // Calculate final total with discount if it's an offer
    const isOffer = orderType === "offre_client" || orderType === "offre_personnel"
    const discount = isOffer && discountPercent ? (amount * (discountPercent / 100)) : 0
    const finalTotal = isOffer ? amount - discount : amount

    // Prepare base order data
    const baseOrderData = {
      tenant_id: session.tenantId,
      client_id: clientId,
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
      confirmed_by: session.activeProfileId,
      confirmed_by_name: session.displayName,
      truecaller_verified: truecallerVerified || false,
      created_by: session.authUserId,
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

    // Update client stats
    const { count: orderCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)

    const { data: allOrders } = await supabase
      .from("orders")
      .select("total")
      .eq("client_id", clientId)

    const totalSpent = allOrders
      ? allOrders.reduce((sum: number, o: { total: number }) => sum + Number(o.total), 0)
      : 0

    await supabase
      .from("clients")
      .update({
        total_orders: orderCount ?? 1,
        total_spent: totalSpent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId)

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error("[v0] Caught error in quick-order:", error)
    return serverErrorResponse(error)
  }
}
