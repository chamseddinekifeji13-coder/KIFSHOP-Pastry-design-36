import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withSession, serverErrorResponse, badRequestResponse } from "@/lib/api-helpers"

export async function POST(request: Request) {
  // Get session with proper error handling
  const [session, authError] = await withSession()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const body = await request.json()
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

    // Build notes with all extra info
    let fullNotes = ""
    if (itemsDescription) fullNotes += itemsDescription
    if (notes) fullNotes += (fullNotes ? " | " : "") + notes
    if (isOffer) fullNotes += (fullNotes ? " | " : "") + `[OFFRE: ${offerBeneficiary || "N/A"} - ${offerReason || "N/A"} - ${discountPercent || 100}%]`
    if (gouvernorat) fullNotes += (fullNotes ? " | " : "") + `Gouvernorat: ${gouvernorat}`

    // Prepare order data - only columns that exist in the database
    const orderData = {
      tenant_id: session.tenantId,
      customer_name: clientName || "Client",
      customer_address: address || null,
      customer_phone: phone,
      total: finalTotal,
      deposit: 0,
      shipping_cost: shippingCost || 0,
      status: "nouveau",
      delivery_type: deliveryType || "pickup",
      courier: courier || null,
      source: source || "phone",
      delivery_date: deliveryDate || null,
      notes: fullNotes || null,
      created_by: session.authUserId,
    }

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
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
    return serverErrorResponse(error)
  }
}
