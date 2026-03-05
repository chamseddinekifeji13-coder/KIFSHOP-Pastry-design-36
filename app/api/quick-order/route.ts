import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/active-profile"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const session = await getServerSession()
    const supabase = await createClient()

    // 2. Parse body
    const body = await request.json()
    const {
      clientId, phone, clientName, amount, itemsDescription, notes,
      source, deliveryType, courier, shippingCost, deliveryDate, address, truecallerVerified,
    } = body

    if (!clientId || !phone || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Donnees invalides: clientId, phone et amount requis" },
        { status: 400 }
      )
    }

    // 3. Verify client exists and belongs to this tenant
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, status, return_count, tenant_id")
      .eq("id", clientId)
      .eq("tenant_id", session.tenantId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Client non trouve" },
        { status: 404 }
      )
    }

    // 4. Business rules
    if (client.status === "blacklisted") {
      return NextResponse.json(
        { error: "Client blackliste. Commande refusee." },
        { status: 403 }
      )
    }

    if (client.return_count >= 2) {
      return NextResponse.json(
        { error: "Trop de retours. Commande bloquee." },
        { status: 403 }
      )
    }

    // 5. Create quick order (with agent tracking)
    const { data: order, error: orderError } = await supabase
      .from("quick_orders")
      .insert({
        tenant_id: session.tenantId,
        client_id: clientId,
        phone: phone,
        client_name: clientName || null,
        amount: amount,
        items_description: itemsDescription || null,
        notes: notes || null,
        status: "confirmed",
        confirmed_by: session.activeProfileId,
        confirmed_by_name: session.displayName,
        source: source || "phone",
        delivery_type: deliveryType || "pickup",
        courier: courier || null,
        shipping_cost: shippingCost || 0,
        delivery_date: deliveryDate || null,
        address: address || null,
        truecaller_verified: truecallerVerified || false,
      })
      .select()
      .single()

    if (orderError) {
      console.error("Quick order creation error:", orderError)
      return NextResponse.json(
        { error: "Erreur creation commande" },
        { status: 500 }
      )
    }

    // 6. Update client stats
    await supabase
      .from("clients")
      .update({
        total_orders: client.return_count >= 0 ? (await getClientOrderCount(supabase, clientId)) : 1,
        total_spent: (await getClientTotalSpent(supabase, clientId)),
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getClientOrderCount(supabase: any, clientId: string): Promise<number> {
  const { count } = await supabase
    .from("quick_orders")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)

  return count ?? 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getClientTotalSpent(supabase: any, clientId: string): Promise<number> {
  const { data } = await supabase
    .from("quick_orders")
    .select("amount")
    .eq("client_id", clientId)

  if (!data) return 0
  return data.reduce((sum: number, o: { amount: number }) => sum + Number(o.amount), 0)
}
