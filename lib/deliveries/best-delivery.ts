import { createClient } from "@/lib/supabase/client"

export interface BestDeliveryConfig {
  tenantId: string
  apiKey: string
  apiSecret: string
  apiUrl: string
  isActive: boolean
}

export interface ShipmentPayload {
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  recipientCity: string
  itemDescription: string
  itemWeight?: number
  itemValue: number
  reference: string
  notes?: string
}

export interface ShipmentResponse {
  shipmentId: string
  trackingNumber: string
  status: string
  reference: string
  createdAt: string
}

/**
 * Récupère la configuration Best Delivery du tenant
 */
export async function getBestDeliveryConfig(tenantId: string): Promise<BestDeliveryConfig | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", "best_delivery")
    .single()

  if (error || !data) {
    console.log("No Best Delivery config found:", error?.message)
    return null
  }

  return {
    tenantId,
    apiKey: data.api_key,
    apiSecret: data.api_secret,
    apiUrl: data.api_url || "https://api.best-delivery.net",
    isActive: data.is_active,
  }
}

/**
 * Sauvegarde la configuration Best Delivery
 */
export async function saveBestDeliveryConfig(tenantId: string, config: Omit<BestDeliveryConfig, "tenantId">): Promise<boolean> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("provider", "best_delivery")
    .single()

  if (existing) {
    const { error } = await supabase
      .from("integrations")
      .update({
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        api_url: config.apiUrl,
        is_active: config.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)

    if (error) {
      console.error("Error updating Best Delivery config:", error)
      return false
    }
  } else {
    const { error } = await supabase
      .from("integrations")
      .insert({
        tenant_id: tenantId,
        provider: "best_delivery",
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        api_url: config.apiUrl,
        is_active: config.isActive,
      })

    if (error) {
      console.error("Error creating Best Delivery config:", error)
      return false
    }
  }

  return true
}

/**
 * Teste la connexion à l'API Best Delivery
 */
export async function testBestDeliveryConnection(config: BestDeliveryConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.apiUrl}/api/v1/health`, {
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    })

    return response.ok
  } catch (error) {
    console.error("Best Delivery connection test failed:", error)
    return false
  }
}

/**
 * Crée un shipment sur Best Delivery
 */
export async function createShipmentOnBestDelivery(
  config: BestDeliveryConfig,
  payload: ShipmentPayload
): Promise<ShipmentResponse | null> {
  try {
    if (!config.isActive) {
      throw new Error("Best Delivery integration is not active")
    }

    const requestBody = {
      recipient: {
        name: payload.recipientName,
        phone: payload.recipientPhone,
        address: payload.recipientAddress,
        city: payload.recipientCity,
      },
      shipment: {
        description: payload.itemDescription,
        weight: payload.itemWeight || 0,
        value: payload.itemValue,
      },
      reference: payload.reference,
      notes: payload.notes,
    }

    console.log("[v0] Sending shipment to Best Delivery:", requestBody)

    const response = await fetch(`${config.apiUrl}/api/v1/shipments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Best Delivery API error: ${error.message || response.statusText}`)
    }

    const result = await response.json()

    return {
      shipmentId: result.shipment_id || result.id,
      trackingNumber: result.tracking_number,
      status: result.status,
      reference: payload.reference,
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error("[v0] Error creating shipment on Best Delivery:", error)
    throw error
  }
}

/**
 * Sauvegarde l'envoi dans la base de données
 */
export async function recordShipmentExport(
  tenantId: string,
  orderId: string,
  shipmentResponse: ShipmentResponse
): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("delivery_exports")
    .insert({
      tenant_id: tenantId,
      order_id: orderId,
      provider: "best_delivery",
      shipment_id: shipmentResponse.shipmentId,
      tracking_number: shipmentResponse.trackingNumber,
      status: shipmentResponse.status,
      response: shipmentResponse,
      exported_at: new Date().toISOString(),
    })

  if (error) {
    console.error("Error recording shipment export:", error)
    return false
  }

  return true
}

/**
 * Récupère l'historique des envois Best Delivery pour une commande
 */
export async function getShipmentHistory(tenantId: string, orderId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("delivery_exports")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .eq("provider", "best_delivery")
    .order("exported_at", { ascending: false })

  if (error) {
    console.error("Error fetching shipment history:", error)
    return []
  }

  return data || []
}
