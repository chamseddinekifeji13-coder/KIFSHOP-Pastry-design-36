import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────

export type DeliveryStatus = "pending" | "sent" | "in_transit" | "delivered" | "failed" | "returned"

export interface DeliveryShipment {
  id: string
  tenantId: string
  orderId: string
  orderNumber: string | null
  customerName: string
  customerPhone: string | null
  customerAddress: string
  deliveryType: string | null
  trackingNumber: string | null
  shipmentId: string | null
  status: DeliveryStatus
  notes: string | null
  exportedAt: string
  responseData: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface DeliveryStats {
  total: number
  pending: number
  sent: number
  inTransit: number
  delivered: number
  failed: number
  returned: number
  deliveryRate: number
  returnRate: number
  failureRate: number
}

export interface DeliveryTrend {
  date: string
  delivered: number
  returned: number
  failed: number
  total: number
}

export interface CourierPerformance {
  courier: string
  total: number
  delivered: number
  returned: number
  failed: number
  deliveryRate: number
}

// ─── Fetch Shipments ──────────────────────────────────────────

export async function fetchDeliveryShipments(tenantId: string): Promise<DeliveryShipment[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("best_delivery_shipments")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching delivery shipments:", error.message)
    return []
  }

  return (data || []).map((s) => ({
    id: s.id,
    tenantId: s.tenant_id,
    orderId: s.order_id,
    orderNumber: s.order_number,
    customerName: s.customer_name,
    customerPhone: s.customer_phone,
    customerAddress: s.customer_address,
    deliveryType: s.delivery_type,
    trackingNumber: s.tracking_number,
    shipmentId: s.shipment_id,
    status: s.status as DeliveryStatus,
    notes: s.notes,
    exportedAt: s.exported_at,
    responseData: s.response_data,
    errorMessage: s.error_message,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }))
}

// ─── Calculate Statistics ─────────────────────────────────────

export function calculateDeliveryStats(shipments: DeliveryShipment[]): DeliveryStats {
  const total = shipments.length
  const pending = shipments.filter((s) => s.status === "pending").length
  const sent = shipments.filter((s) => s.status === "sent").length
  const inTransit = shipments.filter((s) => s.status === "in_transit").length
  const delivered = shipments.filter((s) => s.status === "delivered").length
  const failed = shipments.filter((s) => s.status === "failed").length
  const returned = shipments.filter((s) => s.status === "returned").length

  const completed = delivered + failed + returned
  const deliveryRate = completed > 0 ? (delivered / completed) * 100 : 0
  const returnRate = completed > 0 ? (returned / completed) * 100 : 0
  const failureRate = completed > 0 ? (failed / completed) * 100 : 0

  return {
    total,
    pending,
    sent,
    inTransit,
    delivered,
    failed,
    returned,
    deliveryRate,
    returnRate,
    failureRate,
  }
}

// ─── Calculate Trends (Last 30 days) ──────────────────────────

export function calculateDeliveryTrends(shipments: DeliveryShipment[]): DeliveryTrend[] {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const trendsMap = new Map<string, DeliveryTrend>()

  // Initialize last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split("T")[0]
    trendsMap.set(dateStr, { date: dateStr, delivered: 0, returned: 0, failed: 0, total: 0 })
  }

  // Populate with actual data
  shipments.forEach((s) => {
    const dateStr = new Date(s.createdAt).toISOString().split("T")[0]
    const trend = trendsMap.get(dateStr)
    if (trend) {
      trend.total++
      if (s.status === "delivered") trend.delivered++
      if (s.status === "returned") trend.returned++
      if (s.status === "failed") trend.failed++
    }
  })

  return Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Update Shipment Status ───────────────────────────────────

export async function updateShipmentStatus(
  shipmentId: string,
  status: DeliveryStatus,
  notes?: string
): Promise<boolean> {
  const supabase = createClient()

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (notes !== undefined) {
    updates.notes = notes
  }

  const { error } = await supabase
    .from("best_delivery_shipments")
    .update(updates)
    .eq("id", shipmentId)

  if (error) {
    console.error("Error updating shipment status:", error.message)
    return false
  }

  return true
}

// ─── Create Shipment ──────────────────────────────────────────

export interface CreateShipmentData {
  tenantId: string
  orderId: string
  orderNumber?: string
  customerName: string
  customerPhone?: string
  customerAddress: string
  deliveryType?: string
  trackingNumber?: string
  notes?: string
}

export async function createShipment(data: CreateShipmentData): Promise<DeliveryShipment | null> {
  const supabase = createClient()

  const { data: shipment, error } = await supabase
    .from("best_delivery_shipments")
    .insert({
      tenant_id: data.tenantId,
      order_id: data.orderId,
      order_number: data.orderNumber || null,
      customer_name: data.customerName,
      customer_phone: data.customerPhone || null,
      customer_address: data.customerAddress,
      delivery_type: data.deliveryType || "standard",
      tracking_number: data.trackingNumber || null,
      status: "pending",
      notes: data.notes || null,
      exported_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !shipment) {
    console.error("Error creating shipment:", error?.message)
    return null
  }

  return {
    id: shipment.id,
    tenantId: shipment.tenant_id,
    orderId: shipment.order_id,
    orderNumber: shipment.order_number,
    customerName: shipment.customer_name,
    customerPhone: shipment.customer_phone,
    customerAddress: shipment.customer_address,
    deliveryType: shipment.delivery_type,
    trackingNumber: shipment.tracking_number,
    shipmentId: shipment.shipment_id,
    status: shipment.status as DeliveryStatus,
    notes: shipment.notes,
    exportedAt: shipment.exported_at,
    responseData: shipment.response_data,
    errorMessage: shipment.error_message,
    createdAt: shipment.created_at,
    updatedAt: shipment.updated_at,
  }
}

// ─── Delete Shipment ──────────────────────────────────────────

export async function deleteShipment(shipmentId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("best_delivery_shipments")
    .delete()
    .eq("id", shipmentId)

  if (error) {
    console.error("Error deleting shipment:", error.message)
    return false
  }

  return true
}

// ─── Export Functions ─────────────────────────────────────────

export async function exportDeliveryReport(tenantId: string): Promise<{ headers: string[]; data: unknown[][] }> {
  const shipments = await fetchDeliveryShipments(tenantId)

  const headers = [
    "ID Expedition",
    "N° Commande",
    "Client",
    "Telephone",
    "Adresse",
    "Type Livraison",
    "N° Suivi",
    "Statut",
    "Notes",
    "Date Export",
    "Date Creation",
  ]

  const statusLabels: Record<DeliveryStatus, string> = {
    pending: "En attente",
    sent: "Envoyee",
    in_transit: "En transit",
    delivered: "Livree",
    failed: "Echouee",
    returned: "Retour",
  }

  const data = shipments.map((s) => [
    s.shipmentId || s.id.substring(0, 8),
    s.orderNumber || s.orderId.substring(0, 8),
    s.customerName,
    s.customerPhone || "",
    s.customerAddress,
    s.deliveryType || "standard",
    s.trackingNumber || "",
    statusLabels[s.status],
    s.notes || "",
    new Date(s.exportedAt).toLocaleDateString("fr-FR"),
    new Date(s.createdAt).toLocaleDateString("fr-FR"),
  ])

  return { headers, data }
}
