import { createClient } from "@/lib/supabase/client"

export interface BestDeliveryConfig {
  id: string
  tenantId: string
  apiKey: string
  apiSecret: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface BestDeliveryShipment {
  id: string
  tenantId: string
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerAddress: string
  deliveryType: string
  trackingNumber: string
  shipmentId: string
  status: string
  notes: string
  exportedAt: string
  responseData: Record<string, any>
  errorMessage: string
}

// Fetch Best Delivery config for a tenant
export async function fetchBestDeliveryConfig(tenantId: string): Promise<BestDeliveryConfig | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from("best_delivery_config")
      .select("*")
      .eq("tenant_id", tenantId)
      .single()

    if (error) {
      console.log("[v0] Best Delivery config not found:", error.message)
      return null
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      apiKey: data.api_key,
      apiSecret: data.api_secret,
      enabled: data.enabled,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (error) {
    console.error("[v0] Error fetching Best Delivery config:", error)
    return null
  }
}

// Save Best Delivery config
export async function saveBestDeliveryConfig(
  tenantId: string,
  apiKey: string,
  apiSecret: string,
  enabled: boolean
): Promise<boolean> {
  const supabase = createClient()
  try {
    // Check if config exists
    const existing = await fetchBestDeliveryConfig(tenantId)

    if (existing) {
      // Update
      const { error } = await supabase
        .from("best_delivery_config")
        .update({
          api_key: apiKey,
          api_secret: apiSecret,
          enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)

      if (error) {
        console.error("[v0] Error updating Best Delivery config:", error)
        return false
      }
    } else {
      // Insert
      const { error } = await supabase.from("best_delivery_config").insert({
        tenant_id: tenantId,
        api_key: apiKey,
        api_secret: apiSecret,
        enabled,
      })

      if (error) {
        console.error("[v0] Error inserting Best Delivery config:", error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error("[v0] Error saving Best Delivery config:", error)
    return false
  }
}

// Save a shipment record
export async function saveBestDeliveryShipment(
  tenantId: string,
  orderId: string,
  orderNumber: string,
  customerName: string,
  customerPhone: string,
  customerAddress: string,
  deliveryType: string,
  trackingNumber: string,
  shipmentId: string,
  responseData: Record<string, any>,
  errorMessage?: string
): Promise<boolean> {
  const supabase = createClient()
  try {
    const { error } = await supabase.from("best_delivery_shipments").insert({
      tenant_id: tenantId,
      order_id: orderId,
      order_number: orderNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      delivery_type: deliveryType,
      tracking_number: trackingNumber,
      shipment_id: shipmentId,
      status: errorMessage ? "failed" : "sent",
      response_data: responseData,
      error_message: errorMessage || null,
    })

    if (error) {
      console.error("[v0] Error saving shipment:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Error saving Best Delivery shipment:", error)
    return false
  }
}

// Fetch shipment history
export async function fetchBestDeliveryShipments(tenantId: string): Promise<BestDeliveryShipment[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from("best_delivery_shipments")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("exported_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching shipments:", error)
      return []
    }

    return data.map((item) => ({
      id: item.id,
      tenantId: item.tenant_id,
      orderId: item.order_id,
      orderNumber: item.order_number,
      customerName: item.customer_name,
      customerPhone: item.customer_phone,
      customerAddress: item.customer_address,
      deliveryType: item.delivery_type,
      trackingNumber: item.tracking_number,
      shipmentId: item.shipment_id,
      status: item.status,
      notes: item.notes,
      exportedAt: item.exported_at,
      responseData: item.response_data,
      errorMessage: item.error_message,
    }))
  } catch (error) {
    console.error("[v0] Error fetching Best Delivery shipments:", error)
    return []
  }
}
