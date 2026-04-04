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
  status: "nouveau" | "en-preparation" | "pret" | "en-livraison" | "livre" | "annule"
  deliveryType: "pickup" | "delivery"
  courier?: string
  gouvernorat?: string
  delegation?: string
  trackingNumber?: string
  source: "whatsapp" | "messenger" | "phone" | "web" | "instagram" | "tiktok" | "comptoir"
  paymentStatus: "paid" | "unpaid" | "partial"
  createdAt: string
  deliveryDate?: string
  estimatedDeliveryAt?: string
  deliveredAt?: string
  deliveryAddress?: string
  notes?: string
  // Offer fields
  orderType?: "normal" | "offre_client" | "offre_personnel"
  offerBeneficiary?: string
  offerReason?: string
  discountPercent?: number
  discountAmount?: number
  // Order numbering
  orderNumber?: number
  orderNumberDisplay?: string
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
  customerAddress: string
  deliveryType: "pickup" | "delivery"
  courier?: string
  gouvernorat?: string
  shippingCost?: number
  source: string
  deposit?: number
  notes?: string
  deliveryDate: string
  items: { productId: string | null; name: string; quantity: number; price: number }[]
  // Offer fields
  orderType?: "normal" | "offre_client" | "offre_personnel"
  offerBeneficiary?: string
  offerReason?: string
  discountPercent?: number
}

// ─── Fetch Orders ─────────────────────────────────────────────

// Helper function to map delivery status to order status
function mapDeliveryStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "en attente": "en-livraison",
    pending: "en-livraison",
    delivered: "livre",
    livree: "livre",
    failed: "en-livraison",
    returned: "en-livraison",
  }
  
  const normalized = status?.toLowerCase().trim() || ""
  return statusMap[normalized] || "en-livraison"
}

export async function fetchOrders(tenantId: string): Promise<Order[]> {
  const supabase = createClient()
  const orders: Order[] = []

  // Fetch from orders (unique source of truth)
  const { data: quickOrders } = await supabase
    .from("orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (quickOrders && quickOrders.length > 0) {
    quickOrders.forEach((o) => {
      const items = Array.isArray(o.items) ? o.items : []
      orders.push({
        id: o.id,
        tenantId: o.tenant_id,
        customerName: o.customer_name || "",
        customerPhone: o.customer_phone || "",
        customerAddress: o.customer_address || undefined,
        items: items.map((item: any) => ({
          id: item.id || "",
          productId: item.productId || "",
          name: item.name || "",
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
        })),
        total: Number(o.total),
        deposit: o.deposit || 0,
        shippingCost: o.shipping_cost || 0,
        status: o.status || "nouveau",
        deliveryType: o.delivery_type || "pickup",
        courier: o.courier || undefined,
        gouvernorat: o.gouvernorat || undefined,
        delegation: o.delegation || undefined,
        trackingNumber: o.tracking_number || undefined,
        source: o.source || "comptoir",
        paymentStatus: o.payment_status || "unpaid",
        createdAt: o.created_at,
        deliveryDate: o.delivery_date || undefined,
        estimatedDeliveryAt: o.estimated_delivery_at || undefined,
        deliveredAt: o.delivered_at || undefined,
        deliveryAddress: o.customer_address || undefined,
        notes: o.notes || undefined,
        // Offer fields
        orderType: o.order_type || "normal",
        offerBeneficiary: o.offer_beneficiary || undefined,
        offerReason: o.offer_reason || undefined,
        discountPercent: o.discount_percent || 0,
        discountAmount: o.discount_amount || 0,
        // Order numbering
        orderNumber: o.order_number || undefined,
        orderNumberDisplay: o.order_number_display || undefined,
      })
    })
  }

  // Return all valid orders - don't filter them out
  // Sort by creation date descending
  return orders.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  })
}

// ─── Create Order ─────────────────────────────────────────────

export async function createOrder(data: CreateOrderData): Promise<Order | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree - veuillez vous reconnecter")

  // Validation: nom client obligatoire
  if (!data.customerName || data.customerName.trim() === "") {
    throw new Error("Le nom du client est obligatoire")
  }

  // Validation: au moins un article
  if (!data.items || data.items.length === 0) {
    throw new Error("La commande doit contenir au moins un article")
  }

  // Get creator name from auth user
  const creatorName = user.user_metadata?.display_name || user.email || null

  const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.price, 0)
  const shipping = data.deliveryType === "delivery" ? (data.shippingCost || 0) : 0
  const total = subtotal + shipping

  // Validation: total doit etre positif
  if (total <= 0) {
    throw new Error("Le total de la commande doit etre superieur a 0")
  }
  const deposit = data.deposit || 0

  let paymentStatus: "paid" | "unpaid" | "partial" = "unpaid"
  if (deposit >= total) paymentStatus = "paid"
  else if (deposit > 0) paymentStatus = "partial"

  // Get next order number atomically
  let orderNumber: number | null = null
  let orderNumberDisplay: string | null = null
  try {
    const { data: counterData } = await supabase.rpc("get_next_order_number", {
      p_tenant_id: data.tenantId,
    })
    if (counterData && counterData.length > 0) {
      orderNumber = counterData[0].next_number
      orderNumberDisplay = counterData[0].display_text
    }
  } catch (e) {
    console.debug("Order numbering not available yet:", e)
  }

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
      gouvernorat: data.gouvernorat || null,
      source: data.source,
      payment_status: paymentStatus,
      delivery_date: data.deliveryDate || null,
      notes: data.notes || null,
      confirmed_by_name: creatorName,
      // Offer fields
      order_type: data.orderType || "normal",
      offer_beneficiary: data.offerBeneficiary || null,
      offer_reason: data.offerReason || null,
      discount_percent: data.discountPercent || 0,
      discount_amount: (total * ((data.discountPercent || 0) / 100)) || 0,
      // Order numbering
      ...(orderNumber ? { order_number: orderNumber, order_number_display: orderNumberDisplay } : {}),
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

  // Record initial status history (use active profile name if available) - handle gracefully if table doesn't exist
  try {
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      tenant_id: data.tenantId,
      from_status: null,
      to_status: "nouveau",
      changed_by: user.id,
      changed_by_name: creatorName,
      note: "Commande creee",
    })
  } catch (histError: any) {
    console.debug("Could not record status history:", histError.message)
    // Don't fail order creation if status history table doesn't exist
  }

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
    // Offer fields
    orderType: order.order_type || "normal",
    offerBeneficiary: order.offer_beneficiary || undefined,
    offerReason: order.offer_reason || undefined,
    discountPercent: order.discount_percent || 0,
    discountAmount: order.discount_amount || 0,
    // Order numbering
    orderNumber: order.order_number || undefined,
    orderNumberDisplay: order.order_number_display || undefined,
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
  const changerName = user?.user_metadata?.display_name || user?.email || null
  
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
    .from("orders")
    .update(updates)
    .eq("id", orderId)

  if (error) {
    console.error("Error updating payment:", error.message)
    return false
  }

  // Record as note in history
  const { data: { user } } = await supabase.auth.getUser()
  const updaterName = user?.user_metadata?.display_name || user?.email || null
  
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
    .from("orders")
    .select("total")
    .eq("id", data.orderId)
    .single()

  const orderTotal = Number(order?.total || 0)

  let paymentStatus: "paid" | "unpaid" | "partial" = "unpaid"
  if (totalCollected >= orderTotal) paymentStatus = "paid"
  else if (totalCollected > 0) paymentStatus = "partial"

  // Update order payment status and deposit
  await supabase
    .from("orders")
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
  const activeProfile = null // Profile tracking removed to avoid server-only imports in client contexts
  const recorderName = user?.user_metadata?.display_name || user?.email || null
  
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
    .from("orders")
    .select("total")
    .eq("id", orderId)
    .single()

  const orderTotal = Number(order?.total || 0)

  let paymentStatus: "paid" | "unpaid" | "partial" = "unpaid"
  if (totalCollected >= orderTotal) paymentStatus = "paid"
  else if (totalCollected > 0) paymentStatus = "partial"

  await supabase
    .from("orders")
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
    .from("orders")
    .delete()
    .eq("id", orderId)

  if (error) {
    console.error("Error deleting order:", error.message)
    return false
  }

  return true
}

// ─── Order Counter Management ────────────────────────────────────

export async function getOrderCounter(tenantId: string): Promise<{ currentCounter: number; lastResetAt: string | null } | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("order_counters")
    .select("current_counter, last_reset_at")
    .eq("tenant_id", tenantId)
    .single()

  if (error || !data) return null

  return {
    currentCounter: data.current_counter,
    lastResetAt: data.last_reset_at,
  }
}

export async function resetOrderCounter(tenantId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase.rpc("reset_order_counter", {
      p_tenant_id: tenantId,
    })

    if (error) {
      console.error("Error resetting order counter:", error.message)
      return false
    }

    return true
  } catch (e) {
    console.error("Error resetting order counter:", e)
    return false
  }
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
    order.orderNumberDisplay || order.id.substring(0, 8),
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
    annule: "Annulé",
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

// ─── Fetch All Payment Collections (pour dashboard et KPIs) ───────────

export interface PaymentCollectionWithOrder extends PaymentCollection {
  orderCustomerName?: string
  orderTotal?: number
}

export async function fetchAllPaymentCollections(tenantId: string): Promise<PaymentCollectionWithOrder[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("payment_collections")
    .select(`
      *,
      orders!inner(customer_name, total)
    `)
    .eq("tenant_id", tenantId)
    .order("collected_at", { ascending: false })

  if (error) {
    console.error("Error fetching all payment collections:", error.message)
    return []
  }

  return (data || []).map((p: any) => ({
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
    orderCustomerName: p.orders?.customer_name,
    orderTotal: p.orders?.total ? Number(p.orders.total) : undefined,
  }))
}

// ─── Fonctions pour gérer les encaissements par livreur ───────────

export interface CourierCollection {
  id: string
  orderId: string
  tenantId: string
  amount: number
  paymentMethod: PaymentMethod
  collectorName: string
  collectedAt: string
  recordedByName?: string
  verified: boolean
  verifiedAt?: string
  verifiedByName?: string
  reference?: string
  notes?: string
}

/**
 * Récupère tous les encaissements par livreur NON VERIFIES
 */
export async function getUnverifiedCourierCollections(tenantId: string): Promise<CourierCollection[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("payment_collections")
    .select(`
      id,
      order_id,
      tenant_id,
      amount,
      payment_method,
      collector_name,
      collected_at,
      recorded_by_name,
      reference,
      notes,
      verified,
      verified_at,
      verified_by_name,
      orders!inner(customer_name, total)
    `)
    .eq("tenant_id", tenantId)
    .eq("collected_by", "courier")
    .eq("verified", false)
    .order("collected_at", { ascending: false })

  if (error) {
    console.error("Error fetching unverified courier collections:", error.message)
    return []
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    orderId: p.order_id,
    tenantId: p.tenant_id,
    amount: Number(p.amount),
    paymentMethod: p.payment_method as PaymentMethod,
    collectorName: p.collector_name,
    collectedAt: p.collected_at,
    recordedByName: p.recorded_by_name,
    reference: p.reference,
    notes: p.notes,
    verified: p.verified,
    verifiedAt: p.verified_at,
    verifiedByName: p.verified_by_name,
  }))
}

/**
 * Approuve la réception d'un encaissement par livreur
 */
export async function approveCourierCollection(
  paymentCollectionId: string,
  tenantId: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const verifiedAt = new Date().toISOString()
  const verifiedByName = user?.user_metadata?.display_name || user?.email || null

  const { error } = await supabase
    .from("payment_collections")
    .update({
      verified: true,
      verified_at: verifiedAt,
      verified_by_name: verifiedByName,
    })
    .eq("id", paymentCollectionId)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Error approving courier collection:", error.message)
    return false
  }

  return true
}

/**
 * Approuve tous les encaissements d'un livreur spécifique pour une date donnée
 */
export async function approveCourierCollectionsByDriver(
  tenantId: string,
  driverName: string,
  approvalDate?: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const verifiedAt = new Date().toISOString()
  const verifiedByName = user?.user_metadata?.display_name || user?.email || null
  const dateFilter = approvalDate || new Date().toISOString().split("T")[0]

  // Récupère tous les encaissements du livreur pour cette date
  const { data: collections, error: fetchError } = await supabase
    .from("payment_collections")
    .select("id, collected_at")
    .eq("tenant_id", tenantId)
    .eq("collected_by", "courier")
    .eq("collector_name", driverName)
    .eq("verified", false)
    .gte("collected_at", `${dateFilter}T00:00:00`)
    .lt("collected_at", `${dateFilter}T23:59:59`)

  if (fetchError) {
    console.error("Error fetching courier collections:", fetchError.message)
    return false
  }

  if (!collections || collections.length === 0) {
    return true // Rien à approuver
  }

  // Approuve tous les encaissements trouvés
  const { error: updateError } = await supabase
    .from("payment_collections")
    .update({
      verified: true,
      verified_at: verifiedAt,
      verified_by_name: verifiedByName,
    })
    .in(
      "id",
      collections.map((c: any) => c.id)
    )
    .eq("tenant_id", tenantId)

  if (updateError) {
    console.error("Error approving courier collections:", updateError.message)
    return false
  }

  return true
}

/**
 * Récupère un résumé des encaissements par livreur (vérifiés vs non vérifiés)
 */
export async function getCourierCollectionsSummary(tenantId: string): Promise<{
  unverifiedCount: number
  unverifiedTotal: number
  verifiedCount: number
  verifiedTotal: number
  byCourier: Record<
    string,
    {
      unverifiedCount: number
      unverifiedTotal: number
      verifiedCount: number
      verifiedTotal: number
    }
  >
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("payment_collections")
    .select("collector_name, amount, verified")
    .eq("tenant_id", tenantId)
    .eq("collected_by", "courier")

  if (error) {
    console.error("Error fetching courier collections summary:", error.message)
    return {
      unverifiedCount: 0,
      unverifiedTotal: 0,
      verifiedCount: 0,
      verifiedTotal: 0,
      byCourier: {},
    }
  }

  const summary = {
    unverifiedCount: 0,
    unverifiedTotal: 0,
    verifiedCount: 0,
    verifiedTotal: 0,
    byCourier: {} as Record<
      string,
      {
        unverifiedCount: number
        unverifiedTotal: number
        verifiedCount: number
        verifiedTotal: number
      }
    >,
  }

  for (const collection of data || []) {
    const courier = collection.collector_name || "Non spécifié"
    const amount = Number(collection.amount)

    if (!summary.byCourier[courier]) {
      summary.byCourier[courier] = {
        unverifiedCount: 0,
        unverifiedTotal: 0,
        verifiedCount: 0,
        verifiedTotal: 0,
      }
    }

    if (collection.verified) {
      summary.verifiedCount++
      summary.verifiedTotal += amount
      summary.byCourier[courier].verifiedCount++
      summary.byCourier[courier].verifiedTotal += amount
    } else {
      summary.unverifiedCount++
      summary.unverifiedTotal += amount
      summary.byCourier[courier].unverifiedCount++
      summary.byCourier[courier].unverifiedTotal += amount
    }
  }

  return summary
}
