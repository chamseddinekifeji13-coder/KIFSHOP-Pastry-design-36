"use server"

import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────

export interface OrderItem {
  id?: string
  productId: string | null
  name: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  tenantId: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  items: OrderItem[]
  total: number
  deposit: number
  shippingCost: number
  status: "nouveau" | "en-preparation" | "pret" | "en-livraison" | "livre"
  deliveryType: "pickup" | "delivery"
  courier?: string
  gouvernorat?: string
  trackingNumber?: string
  source: "whatsapp" | "messenger" | "phone" | "web" | "instagram" | "tiktok" | "comptoir"
  paymentStatus: "paid" | "unpaid" | "partial"
  createdAt: string
  deliveryDate?: string
  estimatedDeliveryAt?: string
  deliveredAt?: string
  deliveryAddress?: string
  notes?: string
}

export interface StatusHistoryEntry {
  id: string
  orderId: string
  fromStatus: string | null
  toStatus: string
  changedBy: string | null
  changedByName: string | null
  note: string | null
  createdAt: string
}

export type PaymentMethod = "cash" | "card" | "bank_transfer" | "check" | "cod_courier"
export type CollectedBy = "direct" | "courier" | "online"

export interface PaymentCollection {
  id: string
  orderId: string
  tenantId: string
  amount: number
  paymentMethod: PaymentMethod
  collectedBy: CollectedBy
  collectorName: string | null
  reference: string | null
  notes: string | null
  collectedAt: string
  recordedByName: string | null
  createdAt: string
}

export interface CreatePaymentCollectionData {
  orderId: string
  tenantId: string
  amount: number
  paymentMethod: PaymentMethod
  collectedBy: CollectedBy
  collectorName?: string
  reference?: string
  notes?: string
  collectedAt?: string
}

export interface CreateOrderData {
  tenantId: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  deliveryType: "pickup" | "delivery"
  courier?: string
  gouvernorat?: string
  shippingCost?: number
  source: string
  deposit?: number
  notes?: string
  deliveryDate?: string
  items: { productId: string | null; name: string; quantity: number; price: number }[]
}

// ─── Fetch Orders ─────────────────────────────────────────────

export async function fetchOrders(tenantId: string): Promise<Order[]> {
  const supabase = createClient()

  const { data: orders, error } = await supabase
    .from("quick_orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching orders:", error.message)
    return []
  }

  if (!orders || orders.length === 0) return []

  // quick_orders stores items as JSONB, so no need for separate query
  return orders.map((o) => {
    const items = Array.isArray(o.items) ? o.items : []
    
    return {
      id: o.id,
      tenantId: o.tenant_id,
      customerName: o.client_name || "",
      customerPhone: o.phone || "",
      customerAddress: undefined,
      items: items.map((item: any) => ({
        id: item.id || "",
        productId: item.productId || "",
        name: item.name || "",
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
      })),
      total: Number(o.total),
      deposit: 0,
      shippingCost: 0,
      status: o.status || "nouveau",
      deliveryType: "pickup",
      courier: undefined,
      gouvernorat: undefined,
      trackingNumber: undefined,
      source: o.source || "comptoir",
      paymentStatus: "unpaid",
      createdAt: o.created_at,
      deliveryDate: undefined,
      estimatedDeliveryAt: undefined,
      deliveredAt: undefined,
      deliveryAddress: undefined,
      notes: o.notes || undefined,
    }
  })
}

// ─── Create Order ─────────────────────────────────────────────

export async function createOrder(data: CreateOrderData): Promise<Order | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")

  // Get active profile (employee/agent who is creating the order)
  const activeProfile = await getActiveProfileCookie()
  const creatorName = activeProfile?.displayName || user.user_metadata?.display_name || user.email || null

  const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.price, 0)
  const shipping = data.deliveryType === "delivery" ? (data.shippingCost || 0) : 0
  const total = subtotal + shipping
  const deposit = data.deposit || 0

  let paymentStatus: "paid" | "unpaid" | "partial" = "unpaid"
  if (deposit >= total) paymentStatus = "paid"
  else if (deposit > 0) paymentStatus = "partial"

  // Insert order
  const { data: order, error } = await supabase
    .from("quick_orders")
    .insert({
      tenant_id: data.tenantId,
      customer_name: data.customerName,
      customer_phone: data.customerPhone || null,
      customer_address: data.customerAddress || null,
      delivery_address: data.customerAddress || null,
      total,
      deposit,
      shipping_cost: shipping,
      status: "nouveau",
      delivery_type: data.deliveryType,
      courier: data.courier || null,
      gouvernorat: data.gouvernorat || null,
      source: data.source,
      payment_status: paymentStatus,
      delivery_date: data.deliveryDate || null,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error || !order) {
    console.error("Error creating order:", error?.message)
    return null
  }

  // Insert order items
  const itemRows = data.items.map((item) => ({
    order_id: order.id,
    finished_product_id: item.productId || null,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
  }))

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemRows)

  if (itemsError) {
    console.error("Error creating order items:", itemsError.message)
  }

  // Record initial status history (use active profile name if available)
  await supabase.from("order_status_history").insert({
    order_id: order.id,
    tenant_id: data.tenantId,
    from_status: null,
    to_status: "nouveau",
    changed_by: user.id,
    changed_by_name: creatorName,
    note: "Commande creee",
  })

  return {
    id: order.id,
    tenantId: order.tenant_id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone || "",
    customerAddress: order.customer_address || undefined,
    items: data.items.map((i) => ({ ...i, productId: i.productId })),
    total,
    deposit,
    shippingCost: shipping,
    status: "nouveau",
    deliveryType: order.delivery_type,
    courier: order.courier || undefined,
    gouvernorat: order.gouvernorat || undefined,
    source: order.source,
    paymentStatus,
    createdAt: order.created_at,
    deliveryDate: order.delivery_date || undefined,
    notes: order.notes || undefined,
  }
}

// ─── Update Order Status ────────────────────────��───────────�����─

export async function updateOrderStatus(
  orderId: string,
  tenantId: string,
  newStatus: Order["status"],
  note?: string
): Promise<boolean> {
  const supabase = createClient()

  // Get current status
  const { data: current } = await supabase
    .from("quick_orders")
    .select("status")
    .eq("id", orderId)
    .single()

  const fromStatus = current?.status || null

  // Update order status
  const updates: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  if (newStatus === "livre") {
    updates.delivered_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from("quick_orders")
    .update(updates)
    .eq("id", orderId)

  if (error) {
    console.error("Error updating order status:", error.message)
    return false
  }

  // Record status history
  const { getActiveProfileCookie } = await import("@/lib/active-profile")
  const { data: { user } } = await supabase.auth.getUser()
  const activeProfile = await getActiveProfileCookie()
  const changerName = activeProfile?.displayName || user?.user_metadata?.display_name || user?.email || null
  
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    tenant_id: tenantId,
    from_status: fromStatus,
    to_status: newStatus,
    changed_by: user?.id || null,
    changed_by_name: changerName,
    note: note || null,
  })

  return true
}

// ─── Update Payment Status ────────────────────────────────────

export async function updatePaymentStatus(
  orderId: string,
  tenantId: string,
  paymentStatus: Order["paymentStatus"],
  newDeposit?: number
): Promise<boolean> {
  const supabase = createClient()

  const updates: Record<string, unknown> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  }
  if (newDeposit !== undefined) {
    updates.deposit = newDeposit
  }

  const { error } = await supabase
    .from("quick_orders")
    .update(updates)
    .eq("id", orderId)

  if (error) {
    console.error("Error updating payment:", error.message)
    return false
  }

  // Record as note in history
  const { data: { user } } = await supabase.auth.getUser()
  const activeProfile = await getActiveProfileCookie()
  const updaterName = activeProfile?.displayName || user?.user_metadata?.display_name || user?.email || null
  
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    tenant_id: tenantId,
    from_status: null,
    to_status: paymentStatus === "paid" ? "paiement-complet" : "paiement-partiel",
    changed_by: user?.id || null,
    changed_by_name: updaterName,
    note: paymentStatus === "paid"
      ? "Paiement complet enregistre"
      : `Acompte de ${newDeposit} TND enregistre`,
  })

  return true
}

// ─── Update Delivery Info ─────────────────────────────────────

export async function updateDeliveryInfo(
  orderId: string,
  data: {
    carrier?: string
    trackingNumber?: string
    estimatedDeliveryAt?: string
    shippingCost?: number
  }
): Promise<boolean> {
  const supabase = createClient()

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (data.carrier !== undefined) updates.carrier = data.carrier
  if (data.trackingNumber !== undefined) updates.tracking_number = data.trackingNumber
  if (data.estimatedDeliveryAt !== undefined) updates.estimated_delivery_at = data.estimatedDeliveryAt
  if (data.shippingCost !== undefined) updates.shipping_cost = data.shippingCost

  const { error } = await supabase
    .from("quick_orders")
    .update(updates)
    .eq("id", orderId)

  if (error) {
    console.error("Error updating delivery info:", error.message)
    return false
  }

  return true
}

// ─── Get Status History ───────────────────────────────────────

export async function getOrderStatusHistory(orderId: string): Promise<StatusHistoryEntry[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching status history:", error.message)
    return []
  }

  return (data || []).map((h) => ({
    id: h.id,
    orderId: h.order_id,
    fromStatus: h.from_status,
    toStatus: h.to_status,
    changedBy: h.changed_by,
    changedByName: h.changed_by_name,
    note: h.note,
    createdAt: h.created_at,
  }))
}

// ─── Payment Collections ──────────────────────────────────────

export async function getPaymentCollections(orderId: string): Promise<PaymentCollection[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("payment_collections")
    .select("*")
    .eq("order_id", orderId)
    .order("collected_at", { ascending: true })

  if (error) {
    console.error("Error fetching payment collections:", error.message)
    return []
  }

  return (data || []).map((p) => ({
    id: p.id,
    orderId: p.order_id,
    tenantId: p.tenant_id,
    amount: Number(p.amount),
    paymentMethod: p.payment_method as PaymentMethod,
    collectedBy: p.collected_by as CollectedBy,
    collectorName: p.collector_name,
    reference: p.reference,
    notes: p.notes,
    collectedAt: p.collected_at,
    recordedByName: p.recorded_by_name,
    createdAt: p.created_at,
  }))
}

export async function recordPaymentCollection(
  data: CreatePaymentCollectionData
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Insert payment collection record
  const { error } = await supabase.from("payment_collections").insert({
    order_id: data.orderId,
    tenant_id: data.tenantId,
    amount: data.amount,
    payment_method: data.paymentMethod,
    collected_by: data.collectedBy,
    collector_name: data.collectorName || null,
    reference: data.reference || null,
    notes: data.notes || null,
    collected_at: data.collectedAt || new Date().toISOString(),
    recorded_by: user?.id || null,
    recorded_by_name: user?.user_metadata?.display_name || user?.email || null,
  })

  if (error) {
    console.error("Error recording payment:", error.message)
    return false
  }

  // Calculate total collected for this order
  const { data: allCollections } = await supabase
    .from("payment_collections")
    .select("amount")
    .eq("order_id", data.orderId)

  const totalCollected = (allCollections || []).reduce((sum, p) => sum + Number(p.amount), 0)

  // Get order total to determine payment status
  const { data: order } = await supabase
    .from("quick_orders")
    .select("total")
    .eq("id", data.orderId)
    .single()

  const orderTotal = Number(order?.total || 0)

  let paymentStatus: "paid" | "unpaid" | "partial" = "unpaid"
  if (totalCollected >= orderTotal) paymentStatus = "paid"
  else if (totalCollected > 0) paymentStatus = "partial"

  // Update order payment status and deposit
  await supabase
    .from("quick_orders")
    .update({
      payment_status: paymentStatus,
      deposit: totalCollected,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.orderId)

  // Build descriptive note for history
  const methodLabels: Record<PaymentMethod, string> = {
    cash: "Especes",
    card: "Carte bancaire",
    bank_transfer: "Virement bancaire",
    check: "Cheque",
    cod_courier: "Contre-remboursement (livreur)",
  }
  const collectedByLabels: Record<CollectedBy, string> = {
    direct: "Encaissement direct",
    courier: "Via livreur",
    online: "En ligne",
  }

  const noteText = [
    `${data.amount} TND encaisse`,
    methodLabels[data.paymentMethod],
    collectedByLabels[data.collectedBy],
    data.collectorName ? `par ${data.collectorName}` : null,
    data.reference ? `(Ref: ${data.reference})` : null,
  ].filter(Boolean).join(" - ")

  // Record in status history
  const { getActiveProfileCookie } = await import("@/lib/active-profile")
  const activeProfile = await getActiveProfileCookie()
  const recorderName = activeProfile?.displayName || user?.user_metadata?.display_name || user?.email || null
  
  await supabase.from("order_status_history").insert({
    order_id: data.orderId,
    tenant_id: data.tenantId,
    from_status: null,
    to_status: paymentStatus === "paid" ? "paiement-complet" : "paiement-partiel",
    changed_by: user?.id || null,
    changed_by_name: recorderName,
    note: noteText,
  })

  return true
}

export async function deletePaymentCollection(
  collectionId: string,
  orderId: string,
  tenantId: string
): Promise<boolean> {
  const supabase = createClient()

  // Delete the collection
  const { error } = await supabase
    .from("payment_collections")
    .delete()
    .eq("id", collectionId)

  if (error) {
    console.error("Error deleting payment collection:", error.message)
    return false
  }

  // Recalculate totals
  const { data: remaining } = await supabase
    .from("payment_collections")
    .select("amount")
    .eq("order_id", orderId)

  const totalCollected = (remaining || []).reduce((sum, p) => sum + Number(p.amount), 0)

  const { data: order } = await supabase
    .from("quick_orders")
    .select("total")
    .eq("id", orderId)
    .single()

  const orderTotal = Number(order?.total || 0)

  let paymentStatus: "paid" | "unpaid" | "partial" = "unpaid"
  if (totalCollected >= orderTotal) paymentStatus = "paid"
  else if (totalCollected > 0) paymentStatus = "partial"

  await supabase
    .from("quick_orders")
    .update({
      payment_status: paymentStatus,
      deposit: totalCollected,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)

  return true
}

// ─── Delete Order ─────────────────────────────────────────────

export async function deleteOrder(orderId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("quick_orders")
    .delete()
    .eq("id", orderId)

  if (error) {
    console.error("Error deleting order:", error.message)
    return false
  }

  return true
}

// ─── CSV Export Functions ────────────────────────────────────────

export async function exportOrdersToCSV(tenantId: string): Promise<{ headers: string[]; data: any[][] }> {
  const orders = await fetchOrders(tenantId)

  const headers = [
    "N° Commande",
    "Client",
    "Téléphone",
    "Adresse",
    "Total",
    "Acompte",
    "Frais Livraison",
    "Montant Payé",
    "Statut",
    "Paiement",
    "Type Livraison",
    "Coursier",
    "Source",
    "Date Création",
    "Articles",
  ]

  const data: any[][] = orders.map((order) => [
    order.id.substring(0, 8),
    order.customerName,
    order.customerPhone,
    order.customerAddress || "",
    order.total.toFixed(2),
    order.deposit.toFixed(2),
    order.shippingCost.toFixed(2),
    (order.total - (order.total - order.deposit - order.shippingCost)).toFixed(2),
    translateStatus(order.status),
    translatePaymentStatus(order.paymentStatus),
    order.deliveryType === "pickup" ? "Retrait" : "Livraison",
    order.courier || "",
    translateSource(order.source),
    new Date(order.createdAt).toLocaleDateString("fr-FR"),
    order.items.map((item) => `${item.name} (x${item.quantity})`).join("; "),
  ])

  return { headers, data }
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    nouveau: "Nouveau",
    "en-preparation": "En préparation",
    pret: "Prêt",
    "en-livraison": "En livraison",
    livre: "Livré",
  }
  return map[status] || status
}

function translatePaymentStatus(status: string): string {
  const map: Record<string, string> = {
    paid: "Payé",
    unpaid: "Non payé",
    partial: "Partial",
  }
  return map[status] || status
}

function translateSource(source: string): string {
  const map: Record<string, string> = {
    whatsapp: "WhatsApp",
    messenger: "Messenger",
    phone: "Téléphone",
    web: "Web",
    instagram: "Instagram",
    tiktok: "TikTok",
    comptoir: "Comptoir",
  }
  return map[source] || source
}
