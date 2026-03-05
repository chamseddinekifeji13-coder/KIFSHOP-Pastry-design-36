import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/active-profile"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    const supabase = await createClient()

    const body = await request.json()
    const {
      clientId, phone, clientName, amount, itemsDescription, notes,
      source, deliveryType, courier, gouvernorat, shippingCost, deliveryDate, address, truecallerVerified,
      items,
    } = body

    if (!clientId || !phone || typeof amount !== "number" || amount <= 0) {
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

    // Validate source against allowed values
    const allowedSources = ["whatsapp", "messenger", "phone", "web", "instagram", "comptoir", "tiktok"]
    const validSource = allowedSources.includes(source) ? source : "phone"

    // Insert into orders table (single source of truth)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: session.tenantId,
        client_id: clientId,
        customer_name: clientName || phone || "Client",
        customer_phone: phone,
        customer_address: address || null,
        total: amount,
        shipping_cost: shippingCost || 0,
        status: "nouveau",
        delivery_type: deliveryType || "pickup",
        courier: courier || null,
        gouvernorat: gouvernorat || null,
        source: validSource,
        delivery_date: deliveryDate || null,
        notes: itemsDescription ? `${itemsDescription}${notes ? ` | ${notes}` : ""}` : (notes || null),
        confirmed_by: session.activeProfileId,
        confirmed_by_name: session.displayName,
        truecaller_verified: truecallerVerified || false,
        created_by: session.authUserId,
      })
      .select()
      .single()

    if (orderError) {
      console.error("Order creation error:", orderError)
      return NextResponse.json({ error: "Erreur creation commande" }, { status: 500 })
    }

    // Insert order items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const orderItems = items.map((item: { productId: string; name: string; quantity: number; price: number }) => ({
        order_id: order.id,
        finished_product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      }))

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)

      if (itemsError) {
        console.error("Order items insertion error:", itemsError)
        // Order was created, items failed - log but don't fail the whole request
      }
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
    console.error("Quick order API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    )
  }
}
