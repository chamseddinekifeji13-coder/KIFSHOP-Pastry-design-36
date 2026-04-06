import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { withSession, badRequestResponse, serverErrorResponse } from "@/lib/api-helpers"

type ExportOrderBody = {
  orderId?: string
}

function normalizeUrl(raw: string): string {
  const value = raw.trim()
  return value.endsWith("/") ? value.slice(0, -1) : value
}

export async function POST(request: Request) {
  const [session, authError] = await withSession()
  if (authError) return authError
  if (!session) {
    return NextResponse.json({ error: "Session non trouvee" }, { status: 401 })
  }

  let body: ExportOrderBody
  try {
    body = (await request.json()) as ExportOrderBody
  } catch {
    return badRequestResponse("Corps JSON invalide")
  }

  const orderId = body?.orderId?.trim()
  if (!orderId) {
    return badRequestResponse("orderId est requis")
  }

  const apiBase = process.env.BEST_DELIVERY_API_URL
  if (!apiBase) {
    return NextResponse.json(
      { error: "BEST_DELIVERY_API_URL manquant sur le serveur" },
      { status: 500 }
    )
  }

  try {
    const supabase = createAdminClient()

    const { data: config, error: configError } = await supabase
      .from("best_delivery_config")
      .select("api_key, api_secret, enabled")
      .eq("tenant_id", session.tenantId)
      .maybeSingle()

    if (configError) {
      return NextResponse.json(
        { error: `Erreur lecture config livraison: ${configError.message}` },
        { status: 500 }
      )
    }

    if (!config || !config.enabled) {
      return NextResponse.json(
        { error: "Configuration Best Delivery absente ou desactivee" },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, tenant_id, customer_name, customer_phone, customer_address, total, deposit, shipping_cost, delivery_type, tracking_number, notes, created_at")
      .eq("id", orderId)
      .eq("tenant_id", session.tenantId)
      .maybeSingle()

    if (orderError) {
      return NextResponse.json(
        { error: `Erreur lecture commande: ${orderError.message}` },
        { status: 500 }
      )
    }
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
    }
    if (order.delivery_type !== "delivery") {
      return NextResponse.json(
        { error: "Seules les commandes en livraison sont exportables" },
        { status: 400 }
      )
    }

    const codAmount = Math.max(0, Number(order.total || 0) - Number(order.deposit || 0))
    const payload = {
      orderId: order.id,
      orderNumber: order.id.slice(0, 8),
      customerName: order.customer_name || "Client",
      customerPhone: order.customer_phone || "",
      customerAddress: order.customer_address || "",
      deliveryType: "standard",
      codAmount,
      shippingCost: Number(order.shipping_cost || 0),
      trackingNumber: order.tracking_number || null,
      notes: order.notes || null,
      createdAt: order.created_at,
    }

    const endpoint = `${normalizeUrl(apiBase)}/shipments`
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.api_key}`,
        "X-API-SECRET": config.api_secret,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    let responseData: Record<string, unknown> | null = null
    try {
      responseData = text ? (JSON.parse(text) as Record<string, unknown>) : null
    } catch {
      responseData = text ? { raw: text } : null
    }

    const shipmentId =
      (responseData?.shipment_id as string | undefined) ||
      (responseData?.id as string | undefined) ||
      order.tracking_number ||
      null

    const status = response.ok ? "sent" : "failed"
    const errorMessage = response.ok ? null : `HTTP ${response.status}`

    const { data: existing } = await supabase
      .from("best_delivery_shipments")
      .select("id")
      .eq("tenant_id", session.tenantId)
      .eq("order_id", order.id)
      .maybeSingle()

    if (existing?.id) {
      await supabase
        .from("best_delivery_shipments")
        .update({
          customer_name: payload.customerName,
          customer_phone: payload.customerPhone || null,
          customer_address: payload.customerAddress,
          tracking_number: payload.trackingNumber,
          shipment_id: shipmentId,
          status,
          cod_amount: payload.codAmount,
          notes: payload.notes,
          response_data: responseData,
          error_message: errorMessage,
          exported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    } else {
      await supabase
        .from("best_delivery_shipments")
        .insert({
          tenant_id: session.tenantId,
          order_id: order.id,
          order_number: payload.orderNumber,
          customer_name: payload.customerName,
          customer_phone: payload.customerPhone || null,
          customer_address: payload.customerAddress,
          tracking_number: payload.trackingNumber,
          shipment_id: shipmentId,
          status,
          cod_amount: payload.codAmount,
          notes: payload.notes,
          response_data: responseData,
          error_message: errorMessage,
          exported_at: new Date().toISOString(),
        })
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Export API echoue",
          details: responseData || text || `HTTP ${response.status}`,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      shipmentId,
      response: responseData,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

