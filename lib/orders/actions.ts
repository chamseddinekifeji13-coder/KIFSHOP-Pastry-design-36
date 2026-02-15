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
  trackingNumber?: string
  source: "whatsapp" | "messenger" | "phone" | "web" | "instagram" | "comptoir"
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

export interface CreateOrderData {
  tenantId: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  deliveryType: "pickup" | "delivery"
  courier?: string
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
    .from("orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching orders:", error.message)
    return []
  }

  if (!orders || orders.length === 0) return []

  // Fetch all order items in one query
  const orderIds = orders.map((o) => o.id)
  const { data: allItems } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds)

  const itemsByOrder = new Map<string, OrderItem[]>()
  allItems?.forEach((item) => {
    const list = itemsByOrder.get(item.order_id) || []
    list.push({
      id: item.id,
      productId: item.finished_product_id,
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.unit_price),
    })
    itemsByOrder.set(item.order_id, list)
  })

  return orders.map((o) => ({
    id: o.id,
    tenantId: o.tenant_id,
    customerName: o.customer_name,
    customerPhone: o.customer_phone || "",
    customerAddress: o.customer_address || undefined,
    items: itemsByOrder.get(o.id) || [],
    total: Number(o.total),
    deposit: Number(o.deposit),
    shippingCost: Number(o.shipping_cost || 0),
    status: o.status,
    deliveryType: o.delivery_type,
    courier: o.courier || undefined,
    trackingNumber: o.tracking_number || undefined,
    source: o.source,
    paymentStatus: o.payment_status,
    createdAt: o.created_at,
    deliveryDate: o.delivery_date || undefined,
    estimatedDeliveryAt: o.estimated_delivery_at || undefined,
    deliveredAt: o.delivered_at || undefined,
    deliveryAddress: o.delivery_address || undefined,
    notes: o.notes || undefined,
  }))
}

// ─── Create Order ─────────────────────────────────────────────

export async function createOrder(data: CreateOrderData): Promise<Order | null> {
  const supabase = createClient()

  const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.price, 0)
  const shipping = data.deliveryType === "delivery" ? (data.shippingCost || 0) : 0
  const total = subtotal + shipping
  const deposit = data.deposit || 0

  let paymentStatus: "paid" | "unpaid" | "partial" = "unpaid"
  if (deposit >= total) paymentStatus = "paid"
  else if (deposit > 0) paymentStatus = "partial"

  // Insert order
  const { data: order, error } = await supabase
    .from("orders")
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

  // Record initial status history
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from("order_status_history").insert({
    order_id: order.id,
    tenant_id: data.tenantId,
    from_status: null,
    to_status: "nouveau",
    changed_by: user?.id || null,
    changed_by_name: user?.user_metadata?.display_name || user?.email || null,
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
    source: order.source,
    paymentStatus,
    createdAt: order.created_at,
    deliveryDate: order.delivery_date || undefined,
    notes: order.notes || undefined,
  }
}

// ─── Update Order Status ──────────────────────────────────────

export async function updateOrderStatus(
  orderId: string,
  tenantId: string,
  newStatus: Order["status"],
  note?: string
): Promise<boolean> {
  const supabase = createClient()

  // Get current status
  const { data: current } = await supabase
    .from("orders")
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
    .from("orders")
    .update(updates)
    .eq("id", orderId)

  if (error) {
    console.error("Error updating order status:", error.message)
    return false
  }

  // Record status history
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    tenant_id: tenantId,
    from_status: fromStatus,
    to_status: newStatus,
    changed_by: user?.id || null,
    changed_by_name: user?.user_metadata?.display_name || user?.email || null,
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
    .from("orders")
    .update(updates)
    .eq("id", orderId)

  if (error) {
    console.error("Error updating payment:", error.message)
    return false
  }

  // Record as note in history
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    tenant_id: tenantId,
    from_status: null,
    to_status: paymentStatus === "paid" ? "paiement-complet" : "paiement-partiel",
    changed_by: user?.id || null,
    changed_by_name: user?.user_metadata?.display_name || user?.email || null,
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
    .from("orders")
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

// ─── Delete Order ─────────────────────────────────────────────

export async function deleteOrder(orderId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)

  if (error) {
    console.error("Error deleting order:", error.message)
    return false
  }

  return true
}
