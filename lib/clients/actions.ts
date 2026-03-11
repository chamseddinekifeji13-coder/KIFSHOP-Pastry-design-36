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

// ─── Fetch Clients ────────────────────────────────────────────
// Filtre les clients sans nom ET sans commandes (donnees inutiles)

export async function fetchClients(tenantId: string): Promise<Client[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) { console.error("Error fetching clients:", error); return [] }
  
  // Filtrer les clients invalides: sans nom ET sans commandes
  const validClients = (data || []).filter(client => {
    const hasName = client.name && client.name.trim() !== ""
    const hasOrders = (client.total_orders || 0) > 0
    return hasName || hasOrders
  })
  
  return validClients.map(mapClient)
}

// ─── Fetch Single Client ──────────────────────────────────────

export async function fetchClientById(clientId: string): Promise<Client | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()

  if (error || !data) return null
  return mapClient(data)
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

export async function fetchAgentStats(tenantId: string): Promise<AgentStats[]> {
  const supabase = createClient()

  // 1. Fetch all active agents (vendeur + gerant roles)
  const { data: agents } = await supabase
    .from("tenant_users")
    .select("id, display_name, role")
    .eq("tenant_id", tenantId)
    .in("role", ["vendeur", "gerant", "owner"])

  // 2. Fetch orders with confirmed_by
  const { data: orders, error } = await supabase
    .from("orders")
    .select("confirmed_by, confirmed_by_name, total, status")
    .eq("tenant_id", tenantId)

  if (error) { console.error("Error fetching agent stats:", error) }

  // 3. Fetch returns from best_delivery_shipments
  const { data: bdReturns } = await supabase
    .from("best_delivery_shipments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "returned")

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
    clientName: row.customer_name,
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
