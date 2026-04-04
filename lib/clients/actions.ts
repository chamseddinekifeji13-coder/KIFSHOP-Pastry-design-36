import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────

export interface Client {
  id: string
  tenantId: string
  phone: string
  name: string | null
  status: "normal" | "vip" | "warning" | "blacklisted"
  returnCount: number
  totalOrders: number
  totalSpent: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderRecord {
  id: string
  tenantId: string
  clientId: string | null
  phone: string | null
  clientName: string | null
  total: number
  status: string
  notes: string | null
  source: string | null
  deliveryType: string | null
  courier: string | null
  shippingCost: number
  deliveryDate: string | null
  deliveryAddress: string | null
  truecallerVerified: boolean
  confirmedBy: string | null
  confirmedByName: string | null
  returnedBy: string | null
  returnedByName: string | null
  returnStatus: string | null
  paymentStatus: string | null
  createdAt: string
}

export interface AgentStats {
  agentId: string
  agentName: string
  totalConfirmed: number
  totalReturned: number
  totalRevenue: number
  confirmationRate: number
  returnRate: number
}

// ─── Fetch Clients with Best Delivery Stats ───────────────────
// Enriches clients with stats from best_delivery_shipments during startup phase

export async function fetchClients(tenantId: string): Promise<Client[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) { console.error("Error fetching clients:", error); return [] }

  // Fetch all orders for this tenant in a single query (for stats enrichment)
  const { data: allOrders } = await supabase
    .from("orders")
    .select("customer_phone, total, status")
    .eq("tenant_id", tenantId)

  // Build a map of phone -> order stats from the orders table
  const orderStatsMap = new Map<string, { count: number; total: number }>()
  if (allOrders) {
    for (const o of allOrders) {
      const phone = (o.customer_phone || "").trim()
      if (!phone) continue
      const existing = orderStatsMap.get(phone) || { count: 0, total: 0 }
      existing.count++
      existing.total += Number(o.total) || 0
      orderStatsMap.set(phone, existing)
    }
  }

  // Enrich each client with Best Delivery stats + orders table stats
  const enrichedClients = await Promise.all(
    (data || []).map(async (clientRow) => {
      const client = mapClient(clientRow)

      // Fetch Best Delivery shipments for this client
      const { data: shipments } = await supabase
        .from("best_delivery_shipments")
        .select("status, cod_amount")
        .eq("tenant_id", tenantId)
        .eq("customer_phone", client.phone)

      // Calculate stats from Best Delivery
      let bdCount = 0
      let bdTotal = 0
      let bdReturned = 0

      if (shipments && shipments.length > 0) {
        shipments.forEach((shipment) => {
          const status = (shipment.status || "").toLowerCase()
          const isDelivered = status === "delivered" || status === "livree" || status === "livré" || status.startsWith("livr")
          const isReturned = status === "returned" || status === "retour"

          if (isDelivered) {
            bdCount++
            bdTotal += Number(shipment.cod_amount) || 0
          } else if (isReturned) {
            bdReturned++
          }
        })
      }

      // Combine stats: Best Delivery + orders table
      // Use orders table stats as well so campaigns audience filtering works correctly
      const orderStats = orderStatsMap.get(client.phone) || { count: 0, total: 0 }

      return {
        ...client,
        totalOrders: bdCount + orderStats.count,
        totalSpent: bdTotal + orderStats.total,
        returnCount: bdReturned,
      }
    })
  )

  return enrichedClients
}

// ─── Fetch Single Client with Best Delivery Stats ─────────────

export async function fetchClientById(clientId: string): Promise<Client | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()

  if (error || !data) return null

  const client = mapClient(data)

  // Fetch Best Delivery shipments for this client
  const { data: shipments } = await supabase
    .from("best_delivery_shipments")
    .select("status, cod_amount")
    .eq("tenant_id", client.tenantId)
    .eq("customer_phone", client.phone)

  // Calculate stats from Best Delivery
  let bdCount = 0
  let bdTotal = 0
  let bdReturned = 0

  if (shipments && shipments.length > 0) {
    shipments.forEach((shipment) => {
      const status = (shipment.status || "").toLowerCase()
      const isDelivered = status === "delivered" || status === "livree" || status === "livré" || status.startsWith("livr")
      const isReturned = status === "returned" || status === "retour"

      if (isDelivered) {
        bdCount++
        bdTotal += Number(shipment.cod_amount) || 0
      } else if (isReturned) {
        bdReturned++
      }
    })
  }

  // Fetch order stats from orders table
  const { data: orderData } = await supabase
    .from("orders")
    .select("total")
    .eq("tenant_id", client.tenantId)
    .eq("customer_phone", client.phone)

  const orderCount = orderData?.length || 0
  const orderTotal = (orderData || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  // Combine Best Delivery + orders table stats
  return {
    ...client,
    totalOrders: bdCount + orderCount,
    totalSpent: bdTotal + orderTotal,
    returnCount: bdReturned,
  }
}

// ─── Update Client ────────────────────────────────────────────

export async function updateClient(
  clientId: string,
  updates: Partial<{ name: string; phone: string; status: string; notes: string }>
): Promise<boolean> {
  const supabase = createClient()
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes

  const { error } = await supabase.from("clients").update(dbUpdates).eq("id", clientId)
  if (error) { console.error("Error updating client:", error); return false }
  return true
}

// ─── Delete Client ────────────────────────────────────────────

export async function deleteClient(clientId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("clients").delete().eq("id", clientId)
  if (error) { console.error("Error deleting client:", error); return false }
  return true
}

// ─── Fetch Client Orders (history) ────────────────────────────
// Now queries the unified `orders` table using client_id

export async function fetchClientOrders(clientId: string): Promise<OrderRecord[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) { console.error("Error fetching client orders:", error); return [] }
  return (data || []).map(mapOrder)
}

// ─── Fetch All Orders (for stats) ─────────────────────────────

export async function fetchAllOrders(tenantId: string): Promise<OrderRecord[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) { console.error("Error fetching orders:", error); return [] }
  return (data || []).map(mapOrder)
}

// ─── Mark Order as Returned ───────────────────────────────────

export async function markOrderReturned(
  orderId: string,
  agentId: string,
  agentName: string
): Promise<boolean> {
  const supabase = createClient()

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .update({
      return_status: "returned",
      returned_by: agentId,
      returned_by_name: agentName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("client_id")
    .single()

  if (orderError || !order) { console.error("Error marking returned:", orderError); return false }

  if (order.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("return_count")
      .eq("id", order.client_id)
      .single()

    if (client) {
      await supabase
        .from("clients")
        .update({
          return_count: (client.return_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.client_id)
    }
  }

  return true
}

// ─── Agent Performance Stats ──────────────────────────────────
// Aggregates from orders + best_delivery_shipments for returns
// Respects stats_reset_date: only counts orders created after reset date

export async function fetchAgentStats(tenantId: string): Promise<AgentStats[]> {
  const supabase = createClient()

  // 0. Fetch stats reset date if set (use maybeSingle to avoid errors if not set)
  const { data: settings, error: settingsError } = await supabase
    .from("tenant_settings")
    .select("stats_reset_date")
    .eq("tenant_id", tenantId)
    .maybeSingle()
  
  const resetDate = settings?.stats_reset_date ? new Date(settings.stats_reset_date) : null

  // 1. Fetch all active agents (vendeur + gerant roles)
  const { data: agents } = await supabase
    .from("tenant_users")
    .select("id, display_name, role")
    .eq("tenant_id", tenantId)
    .in("role", ["vendeur", "gerant", "owner"])

  // 2. Fetch orders with confirmed_by
  let query = supabase
    .from("orders")
    .select("confirmed_by, confirmed_by_name, total, status, created_at")
    .eq("tenant_id", tenantId)
  
  // Filter orders created after reset date if set
  if (resetDate) {
    query = query.gte("created_at", resetDate.toISOString())
  }
  
  const { data: orders, error } = await query

  if (error) { console.error("Error fetching agent stats:", error) }

  // 3. Fetch returns from best_delivery_shipments (also respect reset date)
  let bdQuery = supabase
    .from("best_delivery_shipments")
    .select("id, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "returned")
  
  if (resetDate) {
    bdQuery = bdQuery.gte("created_at", resetDate.toISOString())
  }
  
  const { data: bdReturns } = await bdQuery

  const totalBdReturns = bdReturns?.length || 0

  // Build agent map with all agents first
  const agentMap = new Map<string, AgentStats>()

  // Add all agents even if they have no orders
  for (const agent of agents || []) {
    agentMap.set(agent.id, {
      agentId: agent.id,
      agentName: agent.display_name || "Inconnu",
      totalConfirmed: 0, 
      totalReturned: 0, 
      totalRevenue: 0,
      confirmationRate: 0, 
      returnRate: 0,
    })
  }

  // Count orders per agent
  for (const o of orders || []) {
    if (o.confirmed_by && agentMap.has(o.confirmed_by)) {
      const agent = agentMap.get(o.confirmed_by)!
      agent.totalConfirmed++
      // Only count revenue for delivered orders
      if (o.status === "delivered" || o.status === "livre") {
        agent.totalRevenue += Number(o.total) || 0
      }
    }
  }

  // Distribute BD returns proportionally to agents based on their confirmations
  // Since we don't have per-agent return tracking in BD, we assign returns proportionally
  const totalConfirmations = Array.from(agentMap.values()).reduce((sum, a) => sum + a.totalConfirmed, 0)
  
  if (totalConfirmations > 0 && totalBdReturns > 0) {
    for (const agent of agentMap.values()) {
      const proportion = agent.totalConfirmed / totalConfirmations
      agent.totalReturned = Math.round(totalBdReturns * proportion)
    }
  }

  return Array.from(agentMap.values())
    .map((a) => {
      const total = a.totalConfirmed + a.totalReturned
      return {
        ...a,
        confirmationRate: total > 0 ? Math.round((a.totalConfirmed / total) * 100) : 0,
        returnRate: a.totalConfirmed > 0 ? Math.round((a.totalReturned / a.totalConfirmed) * 100) : 0,
      }
    })
    .sort((a, b) => b.totalConfirmed - a.totalConfirmed)
}

// ─── Mappers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClient(row: any): Client {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    phone: row.phone,
    name: row.name,
    status: row.status,
    returnCount: row.return_count || 0,
    totalOrders: row.total_orders || 0,
    totalSpent: Number(row.total_spent) || 0,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(row: any): OrderRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    phone: row.customer_phone,
    // Compatibility fallback for legacy schemas that used `client_name`
    clientName: row.customer_name || row.client_name || null,
    total: Number(row.total) || 0,
    status: row.status,
    notes: row.notes,
    source: row.source,
    deliveryType: row.delivery_type,
    courier: row.courier,
    shippingCost: Number(row.shipping_cost) || 0,
    deliveryDate: row.delivery_date,
    deliveryAddress: row.delivery_address || row.customer_address,
    truecallerVerified: row.truecaller_verified || false,
    confirmedBy: row.confirmed_by,
    confirmedByName: row.confirmed_by_name,
    returnedBy: row.returned_by,
    returnedByName: row.returned_by_name,
    returnStatus: row.return_status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  }
}
