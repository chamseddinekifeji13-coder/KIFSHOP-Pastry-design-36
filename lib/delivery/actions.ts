import { createClient } from "@/lib/supabase/client"
import { v4 as uuidv4 } from "uuid"

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
  codAmount: number
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
    codAmount: s.cod_amount || 0,
    notes: s.notes,
    exportedAt: s.exported_at,
    responseData: s.response_data,
    errorMessage: s.error_message,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }))
}

// ─── Calculate Statistics ─────────────────────────────────────

// Helper functions for status checking (handles both normalized and CSV formats)
const isDeliveredStatus = (status: string) => {
  const s = status?.toLowerCase() || ""
  return s === "delivered" || s === "livree" || s === "livré" || s.startsWith("livr")
}
const isReturnedStatus = (status: string) => {
  const s = status?.toLowerCase() || ""
  return s === "returned" || s === "retour"
}
const isPendingStatus = (status: string) => {
  const s = status?.toLowerCase() || ""
  return s === "pending" || s === "en_attente" || s === "en attente"
}
const isInTransitStatus = (status: string) => {
  const s = status?.toLowerCase() || ""
  return s === "in_transit" || s === "sent" || s === "en_transit" || s === "transit"
}
const isFailedStatus = (status: string) => {
  const s = status?.toLowerCase() || ""
  return s === "failed" || s === "echec" || s === "échoué"
}

export function calculateDeliveryStats(shipments: DeliveryShipment[]): DeliveryStats {
  const total = shipments.length
  
  // Debug: log all statuses (only in development)
  if (process.env.NODE_ENV === 'development') {
    const allStatuses = shipments.map(s => s.status).filter(Boolean)
    console.log("[v0] All statuses in shipments:", allStatuses)
    console.log("[v0] Total shipments:", total)
  }
  
  const pending = shipments.filter((s) => isPendingStatus(s.status)).length
  const sent = shipments.filter((s) => s.status === "sent").length
  const inTransit = shipments.filter((s) => isInTransitStatus(s.status)).length
  const delivered = shipments.filter((s) => isDeliveredStatus(s.status)).length
  const failed = shipments.filter((s) => isFailedStatus(s.status)).length
  const returned = shipments.filter((s) => isReturnedStatus(s.status)).length

  if (process.env.NODE_ENV === 'development') {
    console.log("[v0] Delivery stats - delivered:", delivered, "returned:", returned, "failed:", failed)
  }

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

// ─── Find or Create Client from Shipment ──────────────────────
// Centralized function to find existing client or create a new one

async function findOrCreateClientFromShipment(
  supabase: ReturnType<typeof createClient>,
  shipment: { order_id: string; customer_name: string; customer_phone: string },
  tenantId: string
): Promise<{ clientId: string | null; clientName: string | null; wasCreated: boolean }> {
  // Step 1: Try to find client via order -> client_id
  const { data: order } = await supabase
    .from("orders")
    .select("id, client_id, customer_phone")
    .eq("id", shipment.order_id)
    .single()

  if (order?.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", order.client_id)
      .single()
    
    if (client) {
      return { clientId: client.id, clientName: client.name, wasCreated: false }
    }
  }

  // Step 2: Try to find client by phone number
  const phone = shipment.customer_phone || order?.customer_phone
  if (phone) {
    const { data: clientByPhone } = await supabase
      .from("clients")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("phone", phone)
      .single()
    
    if (clientByPhone) {
      return { clientId: clientByPhone.id, clientName: clientByPhone.name, wasCreated: false }
    }
  }

  // Step 3: Create a new client if we have enough info
  if (phone && shipment.customer_name) {
    const { data: newClient, error: createError } = await supabase
      .from("clients")
      .insert({
        tenant_id: tenantId,
        name: shipment.customer_name,
        phone: phone,
        status: "normal",
        return_count: 0,
        delivered_count: 0,
        total_orders: 0,
        total_spent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, name")
      .single()

    if (!createError && newClient) {
      console.log(`[v0] Created new client: ${newClient.name} (${phone})`)
      return { clientId: newClient.id, clientName: newClient.name, wasCreated: true }
    } else {
      console.error("[v0] Failed to create client:", createError?.message)
    }
  }

  // No client found and couldn't create one
  return { clientId: null, clientName: null, wasCreated: false }
}

// ─── Sync Return with Client Counter ──────────────────────────
// Increments the client's return_count when a shipment is marked as returned

export async function syncReturnWithClient(
  shipmentId: string,
  tenantId: string
): Promise<{ success: boolean; clientId?: string; clientName?: string; wasCreated?: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get the shipment with order details
  const { data: shipment } = await supabase
    .from("best_delivery_shipments")
    .select("order_id, customer_name, customer_phone")
    .eq("id", shipmentId)
    .single()

  if (!shipment) {
    console.error("Shipment not found")
    return { success: false }
  }

  // Use centralized function to find or create client
  const { clientId, clientName, wasCreated } = await findOrCreateClientFromShipment(
    supabase,
    shipment,
    tenantId
  )

  if (!clientId) {
    console.error("No client found and couldn't create one for this shipment")
    return { success: false }
  }

  // Get the order for later updates
  const { data: order } = await supabase
    .from("orders")
    .select("id, client_id, customer_phone")
    .eq("id", shipment.order_id)
    .single()

  // Get current client data
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, return_count, status")
    .eq("id", clientId)
    .single()

  if (!client) {
    return { success: false }
  }

  // Increment return_count
  const newReturnCount = (client.return_count || 0) + 1

  // Auto-update status based on return count
  let newStatus = client.status
  if (newReturnCount >= 5 && client.status !== "blacklisted") {
    newStatus = "blacklisted"
  } else if (newReturnCount >= 3 && client.status === "normal") {
    newStatus = "warning"
  }

  const { error: updateError } = await supabase
    .from("clients")
    .update({
      return_count: newReturnCount,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId)

  if (updateError) {
    console.error("Error updating client return count:", updateError.message)
    return { success: false }
  }

  // Update order return_status
  if (order) {
    await supabase
      .from("orders")
      .update({
        return_status: "returned",
        returned_by: user?.id || null,
        returned_by_name: user?.user_metadata?.display_name || user?.email || "Best Delivery",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    // Record in status history
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      tenant_id: tenantId,
      from_status: null,
      to_status: "retour-best-delivery",
      changed_by: user?.id || null,
      changed_by_name: user?.user_metadata?.display_name || user?.email || "Systeme",
      note: `Retour via Best Delivery - Client: ${shipment.customer_name}`,
    })
  }

  return { success: true, clientId, clientName: clientName || client.name || shipment.customer_name, wasCreated }
}

// ─── Update Shipment Status with Client Sync ──────────────────
// Enhanced version that syncs with client when status is "returned"

export async function updateShipmentStatusWithSync(
  shipmentId: string,
  tenantId: string,
  status: DeliveryStatus,
  notes?: string
): Promise<{ success: boolean; clientSynced?: boolean; clientName?: string }> {
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
    return { success: false }
  }

  // If status is "returned", sync with client counter
  if (status === "returned") {
    const syncResult = await syncReturnWithClient(shipmentId, tenantId)
    return {
      success: true,
      clientSynced: syncResult.success,
      clientName: syncResult.clientName,
    }
  }

  return { success: true }
}

// ─── Bulk Sync Returns ────────────────────────────────────────
// Sync all returned shipments with client counters

export async function bulkSyncReturns(tenantId: string): Promise<{
  total: number
  synced: number
  failed: number
  details: Array<{ shipmentId: string; clientName: string; success: boolean }>
}> {
  const supabase = createClient()

  // Get all returned shipments that haven't been synced
  const { data: shipments } = await supabase
    .from("best_delivery_shipments")
    .select("id, customer_name, customer_phone, cod_amount")
    .eq("tenant_id", tenantId)
    .eq("status", "returned")

  if (!shipments || shipments.length === 0) {
    return { total: 0, synced: 0, failed: 0, details: [] }
  }

  const details: Array<{ shipmentId: string; clientName: string; success: boolean }> = []
  let synced = 0
  let failed = 0

  for (const shipment of shipments) {
    const result = await syncReturnWithClient(shipment.id, tenantId)
    details.push({
      shipmentId: shipment.id,
      clientName: result.clientName || shipment.customer_name,
      success: result.success,
    })
    if (result.success) synced++
    else failed++
  }

  return { total: shipments.length, synced, failed, details }
}

// ─── Get Client Return History from Best Delivery ─────────────

export async function getClientDeliveryHistory(
  tenantId: string,
  clientPhone: string
): Promise<{
  shipments: DeliveryShipment[]
  stats: { total: number; delivered: number; returned: number; returnRate: number }
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("best_delivery_shipments")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("customer_phone", clientPhone)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching client delivery history:", error.message)
    return { shipments: [], stats: { total: 0, delivered: 0, returned: 0, returnRate: 0 } }
  }

  const shipments = (data || []).map((s) => ({
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
    codAmount: s.cod_amount || 0,
    notes: s.notes,
    exportedAt: s.exported_at,
    responseData: s.response_data,
    errorMessage: s.error_message,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }))

  const total = shipments.length
  const delivered = shipments.filter((s) => s.status === "delivered").length
  const returned = shipments.filter((s) => s.status === "returned").length
  const returnRate = total > 0 ? (returned / total) * 100 : 0

  return { shipments, stats: { total, delivered, returned, returnRate } }
}

// ─── Sync Delivered with Client Counter ───────────────────────
// Increments the client's delivered_count when a shipment is marked as delivered

export async function syncDeliveredWithClient(
  shipmentId: string,
  tenantId: string
): Promise<{ success: boolean; clientId?: string; clientName?: string; wasCreated?: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get the shipment with order details including cod_amount
  const { data: shipment } = await supabase
    .from("best_delivery_shipments")
    .select("order_id, customer_name, customer_phone, cod_amount")
    .eq("id", shipmentId)
    .single()

  if (!shipment) {
    console.error("Shipment not found")
    return { success: false }
  }

  // Use centralized function to find or create client
  const { clientId, clientName, wasCreated } = await findOrCreateClientFromShipment(
    supabase,
    shipment,
    tenantId
  )

  if (!clientId) {
    console.error("No client found and couldn't create one for this shipment")
    return { success: false }
  }

  // Get the order for later updates
  const { data: order } = await supabase
    .from("orders")
    .select("id, client_id, customer_phone, total")
    .eq("id", shipment.order_id)
    .single()

  // Get current client data
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, delivered_count, total_orders, total_spent, status")
    .eq("id", clientId)
    .single()

  if (!client) {
    return { success: false }
  }

  // Increment delivered_count and total_orders
  const newDeliveredCount = (client.delivered_count || 0) + 1
  const newTotalOrders = (client.total_orders || 0) + 1
  // Use cod_amount from shipment if available, otherwise use order total
  const orderAmount = shipment.cod_amount || order?.total || 0
  const newTotalSpent = (client.total_spent || 0) + orderAmount

  // Auto-upgrade to VIP if 10+ successful deliveries
  let newStatus = client.status
  if (newDeliveredCount >= 10 && client.status === "normal") {
    newStatus = "vip"
  }

  const { error: updateError } = await supabase
    .from("clients")
    .update({
      delivered_count: newDeliveredCount,
      total_orders: newTotalOrders,
      total_spent: newTotalSpent,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId)

  if (updateError) {
    console.error("Error updating client delivered count:", updateError.message)
    return { success: false }
  }

  // Update order status to delivered
  if (order) {
    await supabase
      .from("orders")
      .update({
        status: "delivered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    // Record in status history
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      tenant_id: tenantId,
      from_status: null,
      to_status: "delivered",
      changed_by: user?.id || null,
      changed_by_name: user?.user_metadata?.display_name || user?.email || "Best Delivery",
      note: `Livre via Best Delivery - Client: ${shipment.customer_name}`,
    })
  }

  return { success: true, clientId, clientName: clientName || client.name || shipment.customer_name, wasCreated }
}

// ─── Enhanced Status Update with Full Sync ────────────────────

export async function updateShipmentStatusWithFullSync(
  shipmentId: string,
  tenantId: string,
  status: DeliveryStatus,
  notes?: string
): Promise<{ success: boolean; clientSynced?: boolean; clientName?: string; action?: string; clientCreated?: boolean }> {
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
    return { success: false }
  }

  // Sync with client based on status
  if (status === "returned") {
    const syncResult = await syncReturnWithClient(shipmentId, tenantId)
    return {
      success: true,
      clientSynced: syncResult.success,
      clientName: syncResult.clientName,
      action: "retour",
      clientCreated: syncResult.wasCreated,
    }
  }

  if (status === "delivered") {
    const syncResult = await syncDeliveredWithClient(shipmentId, tenantId)
    return {
      success: true,
      clientSynced: syncResult.success,
      clientName: syncResult.clientName,
      action: "livraison",
      clientCreated: syncResult.wasCreated,
    }
  }

  return { success: true }
}

// ─── Bulk Sync Delivered ──────────────────────────────────────

export async function bulkSyncDelivered(tenantId: string): Promise<{
  total: number
  synced: number
  failed: number
  details: Array<{ shipmentId: string; clientName: string; success: boolean }>
}> {
  const supabase = createClient()

  const { data: shipments } = await supabase
    .from("best_delivery_shipments")
    .select("id, customer_name, customer_phone, cod_amount")
    .eq("tenant_id", tenantId)
    .eq("status", "delivered")

  if (!shipments || shipments.length === 0) {
    return { total: 0, synced: 0, failed: 0, details: [] }
  }

  const details: Array<{ shipmentId: string; clientName: string; success: boolean }> = []
  let synced = 0
  let failed = 0

  for (const shipment of shipments) {
    const result = await syncDeliveredWithClient(shipment.id, tenantId)
    details.push({
      shipmentId: shipment.id,
      clientName: result.clientName || shipment.customer_name,
      success: result.success,
    })
    if (result.success) synced++
    else failed++
  }

  return { total: shipments.length, synced, failed, details }
}

// ─── Import CSV Functions ─────────────────────────────────────

export interface CSVImportRow {
  orderNumber?: string
  trackingNumber?: string
  customerName: string
  customerPhone?: string
  customerAddress: string
  fees?: number
  status: DeliveryStatus
  notes?: string
  deliveryDate?: string
  price?: number
  dateAdded?: string
  pickupDate?: string
}

export interface ImportResult {
  total: number
  imported: number
  updated: number
  failed: number
  skipped: number
  errors: Array<{ row: number; error: string }>
  deliveredSynced: number
  returnedSynced: number
}

// Helper function to parse and validate dates
function parseAndValidateDate(dateStr?: string): string | undefined {
  if (!dateStr || dateStr === "" || dateStr === "undefined" || dateStr === "null") {
    return undefined
  }

  // Remove quotes and extra whitespace
  dateStr = dateStr.trim()
  
  // If it's just a number or single character, it's invalid
  if (/^\d+$/.test(dateStr) && dateStr.length <= 2) {
    if (process.env.NODE_ENV === 'development') {
      console.log("[v0] Skipping invalid date:", dateStr)
    }
    return undefined
  }

  try {
    // Try parsing as ISO date or common formats
    const date = new Date(dateStr)
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[v0] Invalid date format:", dateStr)
      }
      return undefined
    }

    // Return ISO string for database storage
    return date.toISOString()
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.log("[v0] Error parsing date:", dateStr, e)
    }
    return undefined
  }
}

export async function parseCSVContent(content: string): Promise<{
  rows: CSVImportRow[]
  errors: Array<{ row: number; error: string }>
}> {
  const lines = content.trim().split("\n")
  const rows: CSVImportRow[] = []
  const errors: Array<{ row: number; error: string }> = []

  if (lines.length < 2) {
    errors.push({ row: 0, error: "Le fichier doit contenir au moins une ligne d'en-tete et une ligne de donnees" })
    return { rows, errors }
  }

  // Parse header (first line)
  const headerLine = lines[0].toLowerCase()
  const headers = headerLine.split(/[,;]/).map((h) => h.trim().replace(/"/g, ""))

  // Normalize accents and special characters in headers
  const normalizeText = (text: string): string => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
  }

  // Map French/English headers to our fields (including Best Delivery format)
  const headerMap: Record<string, keyof CSVImportRow> = {
    // Best Delivery columns
    "code": "trackingNumber",
    "nom": "customerName",
    "client": "customerName",
    "prix": "price",
    "etat": "status",
    "frais": "fees",
    "date d'ajout": "dateAdded",
    "date_d_ajout": "dateAdded",
    "date d'enlèvement": "pickupDate",
    "date_d_enlevement": "pickupDate",
    "date livraison": "deliveryDate",
    "date_livraison": "deliveryDate",
    "etat": "status",
    "état": "status",
    // Standard columns
    "numero_commande": "orderNumber",
    "n_commande": "orderNumber",
    "order_number": "orderNumber",
    "numero commande": "orderNumber",
    "ref": "orderNumber",
    "reference": "orderNumber",
    "tracking": "trackingNumber",
    "numero_suivi": "trackingNumber",
    "n_suivi": "trackingNumber",
    "tracking_number": "trackingNumber",
    "client": "customerName",
    "nom_client": "customerName",
    "customer_name": "customerName",
    "telephone": "customerPhone",
    "téléphone": "customerPhone",
    "phone": "customerPhone",
    "tel": "customerPhone",
    "tél": "customerPhone",
    "customer_phone": "customerPhone",
    "numero_telephone": "customerPhone",
    "num_tel": "customerPhone",
    "adresse": "customerAddress",
    "address": "customerAddress",
    "customer_address": "customerAddress",
    "statut": "status",
    "status": "status",
    "notes": "notes",
    "commentaire": "notes",
    "comment": "notes",
    "delivery_date": "deliveryDate",
    "date": "deliveryDate",
    "montant": "price",
    "amount": "price",
  }

  // Find column indices
  const columnIndices: Partial<Record<keyof CSVImportRow, number>> = {}
  headers.forEach((header, index) => {
    const normalizedHeader = normalizeText(header)
    for (const [key, field] of Object.entries(headerMap)) {
      const normalizedKey = normalizeText(key)
      if (normalizedHeader.includes(normalizedKey) || normalizedHeader === normalizedKey) {
        columnIndices[field] = index
        break
      }
    }
  })

  // Map status values (including Best Delivery statuses)
  const statusMap: Record<string, DeliveryStatus> = {
    // Best Delivery statuses
    "livrée": "delivered",
    "livree": "delivered",
    "retour expéditeur": "returned",
    "retour expediteur": "returned",
    "retour_expediteur": "returned",
    "en cours": "in_transit",
    "en_cours": "in_transit",
    "en attente": "pending",
    "en_attente": "pending",
    "ramassé": "sent",
    "ramasse": "sent",
    "annulé": "failed",
    "annule": "failed",
    // Standard statuses
    "livre": "delivered",
    "livré": "delivered",
    "livr": "delivered",
    "delivered": "delivered",
    "retour": "returned",
    "returned": "returned",
    "retourne": "returned",
    "retourné": "returned",
    "echec": "failed",
    "echoue": "failed",
    "échoué": "failed",
    "failed": "failed",
    "in_transit": "in_transit",
    "transit": "in_transit",
    "envoye": "sent",
    "envoyé": "sent",
    "sent": "sent",
    "pending": "pending",
    "attente": "pending",
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle CSV with quotes
    const values: string[] = []
    let current = ""
    let inQuotes = false
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if ((char === "," || char === ";") && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())

    // Extract fields
    let rawCustomerName = columnIndices.customerName !== undefined 
      ? values[columnIndices.customerName]?.replace(/"/g, "").trim() 
      : ""
    
    // Handle scientific notation in tracking numbers (e.g., "1,08E+11")
    let trackingNumber = columnIndices.trackingNumber !== undefined 
      ? values[columnIndices.trackingNumber]?.replace(/"/g, "").trim()
      : undefined
    
    // Convert scientific notation to regular number if needed
    if (trackingNumber && trackingNumber.includes("E")) {
    try {
      // Validate required fields
      if (!row.customerName || row.customerName.trim() === "") {
        result.errors.push({ row: i + 2, error: "Nom client manquant ou vide" })
        result.failed++
        continue
      }

      if (!row.customerPhone || row.customerPhone.trim() === "") {
        result.errors.push({ row: i + 2, error: "Telephone client manquant" })
        result.failed++
        continue
      }

      // Check if any date is invalid
      if (row.deliveryDate && isNaN(new Date(row.deliveryDate).getTime())) {
        result.errors.push({ row: i + 2, error: `Date livraison invalide: "${row.deliveryDate}"` })
        result.failed++
        continue
      }

      if (row.dateAdded && isNaN(new Date(row.dateAdded).getTime())) {
        result.errors.push({ row: i + 2, error: `Date ajoutee invalide: "${row.dateAdded}"` })
        result.failed++
        continue
      }

      if (row.pickupDate && isNaN(new Date(row.pickupDate).getTime())) {
        result.errors.push({ row: i + 2, error: `Date retrait invalide: "${row.pickupDate}"` })
        result.failed++
        continue
      }
        const num = parseFloat(trackingNumber)
        trackingNumber = Math.floor(num).toString()
      } catch (e) {
        // Keep as is if conversion fails
      }
    }
    
    // Best Delivery format: "Nom Telephone Adresse" in the Nom field
    // Example: "mariem 23232024 *" or "HANIN TLILI 54434722 CENTER"
    let customerPhone = columnIndices.customerPhone !== undefined 
      ? values[columnIndices.customerPhone]?.replace(/"/g, "").trim() 
      : undefined

    let customerName = rawCustomerName
    let customerAddress = columnIndices.customerAddress !== undefined 
      ? values[columnIndices.customerAddress]?.replace(/"/g, "").trim() 
      : ""

    // Parse Best Delivery format: extract phone from name field
    // Phone is typically 8 digits in Tunisia
    const phoneMatch = rawCustomerName.match(/(\d{8})/)
    if (phoneMatch && !customerPhone) {
      customerPhone = phoneMatch[1]
      // Split name field: everything before phone is name, everything after is address hint
      const parts = rawCustomerName.split(phoneMatch[1])
      customerName = parts[0].trim()
      // If there's text after phone and no address, use it as address
      if (parts[1] && !customerAddress) {
        const afterPhone = parts[1].replace(/^\s*\*?\s*/, "").trim()
        if (afterPhone && afterPhone !== "*") {
          customerAddress = afterPhone
        }
      }
    }

    // If no address found, use a placeholder (Best Delivery may not include full address in export)
    if (!customerAddress) {
      customerAddress = "Adresse via Best Delivery"
    }

    if (!customerName) {
      errors.push({ row: i + 1, error: "Nom client manquant" })
      continue
    }

    const rawStatus = columnIndices.status !== undefined 
      ? values[columnIndices.status]?.toLowerCase().replace(/"/g, "").trim() 
      : "pending"
    
    const status = statusMap[rawStatus] || "pending"

    // Extract price if available
    const priceStr = columnIndices.price !== undefined
      ? values[columnIndices.price]?.replace(/"/g, "").trim()
      : undefined
    const price = priceStr ? parseFloat(priceStr) : undefined

    // Validation: prix doit être > 0 (conforme à la logique métier)
    if (price === undefined || price === null || price <= 0) {
      errors.push({ row: i + 1, error: `Prix invalide ou manquant: "${priceStr}". Le prix doit etre > 0` })
      continue
    }

    // Extract fees if available
    const feesStr = columnIndices.fees !== undefined
      ? values[columnIndices.fees]?.replace(/"/g, "").trim()
      : undefined
    const fees = feesStr ? parseFloat(feesStr) : undefined

    rows.push({
      orderNumber: columnIndices.orderNumber !== undefined 
        ? values[columnIndices.orderNumber]?.replace(/"/g, "") 
        : undefined,
      trackingNumber: trackingNumber,
      customerName,
      customerPhone,
      customerAddress,
      status,
      price,
      fees,
      notes: columnIndices.notes !== undefined 
        ? values[columnIndices.notes]?.replace(/"/g, "") 
        : undefined,
      deliveryDate: columnIndices.deliveryDate !== undefined 
        ? parseAndValidateDate(values[columnIndices.deliveryDate]?.replace(/"/g, "").trim())
        : undefined,
      dateAdded: columnIndices.dateAdded !== undefined
        ? parseAndValidateDate(values[columnIndices.dateAdded]?.replace(/"/g, "").trim())
        : undefined,
      pickupDate: columnIndices.pickupDate !== undefined
        ? parseAndValidateDate(values[columnIndices.pickupDate]?.replace(/"/g, "").trim())
        : undefined,
    })
  }

  return { rows, errors }
}

// ─── XML Parser ──────────────────────────────────────────────

export async function parseXMLContent(content: string): Promise<{
  rows: CSVImportRow[]
  errors: Array<{ row: number; error: string }>
}> {
  const rows: CSVImportRow[] = []
  const errors: Array<{ row: number; error: string }> = []

  try {
    // Parse XML
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(content, "text/xml")

    // Check for parsing errors
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      errors.push({ row: 0, error: "Format XML invalide" })
      return { rows, errors }
    }

    // Get all delivery elements
    const deliveries = xmlDoc.getElementsByTagName("delivery")

    if (deliveries.length === 0) {
      errors.push({ row: 0, error: "Aucun element <delivery> trouve dans le XML" })
      return { rows, errors }
    }

    // Parse each delivery
    for (let i = 0; i < deliveries.length; i++) {
      try {
        const delivery = deliveries[i]

        // Helper to get element text
        const getText = (tag: string): string | undefined => {
          const element = delivery.getElementsByTagName(tag)[0]
          return element?.textContent?.trim() || undefined
        }

        const trackingNumber = getText("code") || getText("tracking") || `XML-${i + 1}`
        const customerName = getText("customerName") || getText("nom")
        const customerPhone = getText("customerPhone") || getText("telephone")
        const customerAddress = getText("customerAddress") || getText("adresse")
        const priceStr = getText("codAmount") || getText("prix")
        const feesStr = getText("fees") || getText("frais")
        const statusStr = getText("status") || getText("etat") || "pending"
        const deliveryDateStr = getText("deliveryDate") || getText("date_livraison")
        const notes = getText("notes")
        const orderNumber = getText("orderNumber") || getText("numero_commande")

        // Validation
        if (!customerName) {
          errors.push({ row: i + 1, error: "Nom client manquant" })
          continue
        }

        // Status mapping
        const statusMap: Record<string, string> = {
          "delivered": "delivered",
          "livre": "delivered",
          "pending": "pending",
          "en_attente": "pending",
          "in_transit": "pending",
          "en_transit": "pending",
          "returned": "returned",
          "retour": "returned",
          "failed": "returned",
          "echec": "returned",
        }

        const status = statusMap[statusStr.toLowerCase()] || "pending"
        const price = priceStr ? parseFloat(priceStr) : undefined
        const fees = feesStr ? parseFloat(feesStr) : undefined

        // Parse delivery date
        let deliveryDate: Date | undefined
        if (deliveryDateStr) {
          deliveryDate = parseAndValidateDate(deliveryDateStr)
          if (!deliveryDate) {
            errors.push({ row: i + 1, error: `Date livraison invalide: "${deliveryDateStr}"` })
            continue
          }
        }

        rows.push({
          trackingNumber,
          customerName,
          customerPhone,
          customerAddress,
          price,
          fees,
          status,
          deliveryDate,
          notes,
          orderNumber,
        })
      } catch (err) {
        errors.push({ row: i + 1, error: `Erreur parsing element: ${(err as Error).message}` })
      }
    }
  } catch (err) {
    errors.push({ row: 0, error: `Erreur parsing XML: ${(err as Error).message}` })
  }

  return { rows, errors }
}

export async function importDeliveryReport(
  tenantId: string,
  rows: CSVImportRow[],
  syncClients: boolean = false
): Promise<ImportResult> {
  const supabase = createClient()

  const result: ImportResult = {
    total: rows.length,
    imported: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    deliveredSynced: 0,
    returnedSynced: 0,
  }

  // Track duplicates within the CSV file itself
  const seenInFile = new Map<string, number>()
  const duplicatesInFile: Set<number> = new Set()

  // First pass: detect duplicates within the file
  rows.forEach((row, index) => {
    let uniqueKey = ""

    // Use tracking number as primary key
    if (row.trackingNumber) {
      uniqueKey = `tracking:${row.trackingNumber}`
    }
    // Use order number as secondary key
    else if (row.orderNumber) {
      uniqueKey = `order:${row.orderNumber}`
    }
    // Use customer name + phone as tertiary key
    else if (row.customerName && row.customerPhone) {
      uniqueKey = `customer:${row.customerName.toLowerCase().trim()}:${row.customerPhone}`
    }

    if (uniqueKey) {
      if (seenInFile.has(uniqueKey)) {
        duplicatesInFile.add(index)
      } else {
        seenInFile.set(uniqueKey, index)
      }
    }
  })

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Skip if this row is a duplicate within the file
    if (duplicatesInFile.has(i)) {
      result.skipped++
      result.errors.push({
        row: i + 2,
        error: "Doublon detecte dans le fichier (ligne ignoree)",
      })
      continue
    }

    try {
      // Check if shipment already exists by tracking number, order number, or customer name + phone combination
      let existingShipment = null
      
      // Priority 1: Check by tracking number (most reliable)
      if (row.trackingNumber) {
        const { data } = await supabase
          .from("best_delivery_shipments")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("tracking_number", row.trackingNumber)
          .single()
        existingShipment = data
      }

      // Priority 2: Check by order number
      if (!existingShipment && row.orderNumber) {
        const { data } = await supabase
          .from("best_delivery_shipments")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("order_number", row.orderNumber)
          .single()
        existingShipment = data
      }

      // Priority 3: Check by customer name + phone + EXACT delivery date (same day only)
      // Un client fidele peut commander plusieurs fois - seule la MEME DATE compte comme doublon
      if (!existingShipment && row.customerName && row.customerPhone && row.deliveryDate) {
        // Only match if exact same delivery date (same day)
        const deliveryDateStr = row.deliveryDate.toISOString().split('T')[0]
        const nextDay = new Date(row.deliveryDate)
        nextDay.setDate(nextDay.getDate() + 1)
        
        const { data } = await supabase
          .from("best_delivery_shipments")
          .select("id")
          .eq("tenant_id", tenantId)
          .ilike("customer_name", row.customerName)
          .eq("customer_phone", row.customerPhone)
          .gte("exported_at", deliveryDateStr)
          .lt("exported_at", nextDay.toISOString().split('T')[0])
          .single()
        existingShipment = data
      }

      if (existingShipment) {
        // Update existing shipment
        const { error } = await supabase
          .from("best_delivery_shipments")
          .update({
            customer_name: row.customerName,
            customer_phone: row.customerPhone || null,
            customer_address: row.customerAddress,
            status: row.status,
            cod_amount: row.price || 0,
            notes: row.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingShipment.id)

        if (error) {
          result.errors.push({ row: i + 2, error: `Erreur mise a jour: ${error.message}` })
          result.failed++
          continue
        }

        result.updated++

        // Sync with client if requested
        if (syncClients) {
          if (row.status === "delivered") {
            const syncResult = await syncDeliveredWithClient(existingShipment.id, tenantId)
            if (syncResult.success) result.deliveredSynced++
          } else if (row.status === "returned") {
            const syncResult = await syncReturnWithClient(existingShipment.id, tenantId)
            if (syncResult.success) result.returnedSynced++
          }
        }
      } else {
        // Find or create order for this shipment
        let orderId: string | null = null
        
        // Try to find existing order by order number
        if (row.orderNumber) {
          const { data: order } = await supabase
            .from("orders")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("order_number", row.orderNumber)
            .single()
          
          if (order) {
            orderId = order.id
          }
        }

        // If no existing order found, create one with the price from CSV
        if (!orderId) {
          // Map CSV status to order status (valeurs valides: nouveau, en-preparation, pret, en-livraison, livre, annule)
          const orderStatus = row.status === "delivered" ? "livre" 
            : row.status === "returned" ? "annule"
            : row.status === "pending" ? "nouveau"
            : "en-livraison"
          
          const { data: newOrder, error: orderError } = await supabase
            .from("orders")
            .insert({
              tenant_id: tenantId,
              customer_name: row.customerName,
              customer_phone: row.customerPhone || null,
              customer_address: row.customerAddress,
              total: row.price || 0,
              deposit: row.status === "delivered" ? (row.price || 0) : 0,
              shipping_cost: row.fees || 0,
              status: orderStatus,
              delivery_type: "delivery",
              courier: "best-delivery",
              tracking_number: row.trackingNumber || null,
              source: "web",
              payment_status: row.status === "delivered" ? "paid" : "unpaid",
              notes: row.notes ? `[Best Delivery] ${row.notes}` : "[Best Delivery Import]",
              delivered_at: row.status === "delivered" && row.deliveryDate ? row.deliveryDate : null,
              created_by: user.id,
            })
            .select("id")
            .single()

          if (orderError || !newOrder) {
            result.errors.push({ row: i + 2, error: `Erreur creation commande: ${orderError?.message}` })
            result.failed++
            continue
          }
          
          orderId = newOrder.id
        }

        // Create new shipment linked to the order
        const { data: newShipment, error } = await supabase
          .from("best_delivery_shipments")
          .insert({
            tenant_id: tenantId,
            order_id: orderId,
            order_number: row.orderNumber || null,
            customer_name: row.customerName,
            customer_phone: row.customerPhone || null,
            customer_address: row.customerAddress,
            tracking_number: row.trackingNumber || null,
            status: row.status,
            cod_amount: row.price || 0,
            notes: row.notes || null,
            exported_at: row.deliveryDate || new Date().toISOString(),
          })
          .select("id")
          .single()

        if (error || !newShipment) {
          result.errors.push({ row: i + 2, error: `Erreur creation: ${error?.message}` })
          result.failed++
          continue
        }

        result.imported++

        // Sync with client if requested
        if (syncClients) {
          if (row.status === "delivered") {
            const syncResult = await syncDeliveredWithClient(newShipment.id, tenantId)
            if (syncResult.success) result.deliveredSynced++
          } else if (row.status === "returned") {
            const syncResult = await syncReturnWithClient(newShipment.id, tenantId)
            if (syncResult.success) result.returnedSynced++
          }
        }
      }
    } catch (err) {
      result.errors.push({ row: i + 2, error: `Erreur inattendue: ${(err as Error).message}` })
      result.failed++
    }
  }

  return result
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
