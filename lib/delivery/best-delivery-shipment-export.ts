import type { SupabaseClient } from "@supabase/supabase-js"

function normalizeUrl(raw: string): string {
  const value = raw.trim()
  return value.endsWith("/") ? value.slice(0, -1) : value
}

export type BestDeliveryExportResult =
  | {
      ok: true
      orderId: string
      shipmentId: string | null
      responseData: Record<string, unknown> | null
    }
  | {
      ok: false
      orderId: string
      httpStatus: number
      responseData: Record<string, unknown> | null
      rawText?: string
    }

/**
 * Envoie une commande livraison vers l'API Best Delivery (même charge utile que `/api/delivery/export-order`).
 */
export async function exportOrderToBestDeliveryApi(params: {
  supabase: SupabaseClient
  tenantId: string
  apiBase: string
  apiKey: string
  apiSecret: string
  orderId: string
}): Promise<BestDeliveryExportResult> {
  const { supabase, tenantId, apiBase, apiKey, apiSecret, orderId } = params

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, tenant_id, customer_name, customer_phone, customer_address, total, deposit, shipping_cost, delivery_type, tracking_number, notes, created_at",
    )
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (orderError) {
    throw new Error(`Erreur lecture commande: ${orderError.message}`)
  }
  if (!order) {
    throw new Error("Commande introuvable")
  }
  if (order.delivery_type !== "delivery") {
    throw new Error("Seules les commandes en livraison sont exportables")
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
      Authorization: `Bearer ${apiKey}`,
      "X-API-SECRET": apiSecret,
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
    .eq("tenant_id", tenantId)
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
    await supabase.from("best_delivery_shipments").insert({
      tenant_id: tenantId,
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
    return {
      ok: false,
      orderId: order.id,
      httpStatus: response.status,
      responseData,
      rawText: text,
    }
  }

  return {
    ok: true,
    orderId: order.id,
    shipmentId,
    responseData,
  }
}
