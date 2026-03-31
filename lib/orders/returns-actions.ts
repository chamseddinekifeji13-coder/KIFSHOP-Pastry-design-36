"use server"

import { createClient } from "@/lib/supabase/server"

// ─── Types ────────────────────────────────────────────────────

export type ReturnType = "total" | "partial"
export type ReturnReason =
  | "damaged"
  | "wrong_order"
  | "client_absent"
  | "client_refused"
  | "quality"
  | "expired"
  | "other"
export type ReturnStatus = "pending" | "approved" | "rejected" | "completed"
export type RefundMethod = "cash_refund" | "bank_refund" | "credit_note"

export interface ReturnItem {
  orderItemId?: string
  productName: string
  quantityReturned: number
  unitPrice: number
  subtotal: number
  reason?: string
}

export interface OrderReturn {
  id: string
  orderId: string
  tenantId: string
  returnType: ReturnType
  reason: ReturnReason
  reasonDetails: string | null
  status: ReturnStatus
  refundMethod: RefundMethod | null
  refundAmount: number
  creditNoteId: string | null
  processedByName: string | null
  processedAt: string | null
  createdByName: string | null
  notes: string | null
  createdAt: string
  items: ReturnItem[]
  // Joined from order
  orderCustomerName?: string
  orderTotal?: number
}

export interface CustomerCredit {
  id: string
  tenantId: string
  customerName: string
  customerPhone: string | null
  originalOrderId: string | null
  returnId: string | null
  amount: number
  usedAmount: number
  status: string
  expiresAt: string | null
  notes: string | null
  createdByName: string | null
  createdAt: string
}

export interface CreateReturnData {
  orderId: string
  tenantId: string
  returnType: ReturnType
  reason: ReturnReason
  reasonDetails?: string
  refundMethod: RefundMethod
  items?: ReturnItem[]
  notes?: string
}

export const reasonLabels: Record<ReturnReason, string> = {
  damaged: "Produit endommage",
  wrong_order: "Erreur de commande",
  client_absent: "Client absent",
  client_refused: "Client a refuse",
  quality: "Probleme de qualite",
  expired: "Produit perime",
  other: "Autre",
}

export const statusLabels: Record<ReturnStatus, string> = {
  pending: "En attente",
  approved: "Approuve",
  rejected: "Rejete",
  completed: "Termine",
}

export const refundMethodLabels: Record<RefundMethod, string> = {
  cash_refund: "Remboursement especes",
  bank_refund: "Remboursement bancaire",
  credit_note: "Avoir (credit)",
}

// ─── Fetch Returns ────────────────────────────────────────────

export async function fetchReturns(tenantId: string): Promise<OrderReturn[]> {
  const supabase = await createClient()

  // 1. Fetch from order_returns table
  const { data, error } = await supabase
    .from("order_returns")
    .select(`
      *,
      orders(id, customer_name, total)
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching returns:", error.message)
  }

  // For each return, fetch items
  const returns: OrderReturn[] = []
  for (const r of data || []) {
    const { data: items } = await supabase
      .from("order_return_items")
      .select("*")
      .eq("return_id", r.id)

    const order = r.orders as { customer_name: string; total: number } | null

    returns.push({
      id: r.id,
      orderId: r.order_id,
      tenantId: r.tenant_id,
      returnType: r.return_type as ReturnType,
      reason: r.reason as ReturnReason,
      reasonDetails: r.reason_details,
      status: r.status as ReturnStatus,
      refundMethod: r.refund_method as RefundMethod | null,
      refundAmount: Number(r.refund_amount),
      creditNoteId: r.credit_note_id,
      processedByName: r.processed_by_name,
      processedAt: r.processed_at,
      createdByName: r.created_by_name,
      notes: r.notes,
      createdAt: r.created_at,
      orderCustomerName: order?.customer_name || "",
      orderTotal: order ? Number(order.total) : 0,
      items: (items || []).map((i) => ({
        orderItemId: i.order_item_id,
        productName: i.product_name,
        quantityReturned: i.quantity_returned,
        unitPrice: Number(i.unit_price),
        subtotal: Number(i.subtotal),
        reason: i.reason,
      })),
    })
  }

  // 2. Also fetch returns from best_delivery_shipments
  const { data: bdReturns } = await supabase
    .from("best_delivery_shipments")
    .select("id, order_id, customer_name, customer_phone, cod_amount, tracking_number, created_at, notes")
    .eq("tenant_id", tenantId)
    .eq("status", "returned")
    .order("created_at", { ascending: false })

  // Add Best Delivery returns as virtual returns
  for (const bd of bdReturns || []) {
    returns.push({
      id: `bd-${bd.id}`,
      orderId: bd.order_id || bd.id,
      tenantId: tenantId,
      returnType: "total" as ReturnType,
      reason: "client_refused" as ReturnReason,
      reasonDetails: bd.notes || `Retour Best Delivery - N° Suivi: ${bd.tracking_number || "N/A"}`,
      status: "completed" as ReturnStatus,
      refundMethod: null,
      refundAmount: Number(bd.cod_amount) || 0,
      creditNoteId: null,
      processedByName: "Best Delivery",
      processedAt: bd.created_at,
      createdByName: "Import Best Delivery",
      notes: bd.notes || `Retour livraison - ${bd.tracking_number || ""}`,
      createdAt: bd.created_at,
      orderCustomerName: bd.customer_name || "",
      orderTotal: Number(bd.cod_amount) || 0,
      items: [],
    })
  }

  // Sort all returns by date
  returns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return returns
}

// ─── Get Returns for a specific order ─────────────────────────

export async function getOrderReturns(orderId: string): Promise<OrderReturn[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("order_returns")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching order returns:", error.message)
    return []
  }

  const returns: OrderReturn[] = []
  for (const r of data || []) {
    const { data: items } = await supabase
      .from("order_return_items")
      .select("*")
      .eq("return_id", r.id)

    returns.push({
      id: r.id,
      orderId: r.order_id,
      tenantId: r.tenant_id,
      returnType: r.return_type as ReturnType,
      reason: r.reason as ReturnReason,
      reasonDetails: r.reason_details,
      status: r.status as ReturnStatus,
      refundMethod: r.refund_method as RefundMethod | null,
      refundAmount: Number(r.refund_amount),
      creditNoteId: r.credit_note_id,
      processedByName: r.processed_by_name,
      processedAt: r.processed_at,
      createdByName: r.created_by_name,
      notes: r.notes,
      createdAt: r.created_at,
      items: (items || []).map((i) => ({
        orderItemId: i.order_item_id,
        productName: i.product_name,
        quantityReturned: i.quantity_returned,
        unitPrice: Number(i.unit_price),
        subtotal: Number(i.subtotal),
        reason: i.reason,
      })),
    })
  }

  return returns
}

// ─── Create Return ────────────────────────────────────────────

export async function createReturn(data: CreateReturnData): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get order details
  const { data: order } = await supabase
    .from("orders")
    .select("total, customer_name, customer_phone, deposit")
    .eq("id", data.orderId)
    .single()

  if (!order) {
    console.error("[v0] Order not found")
    return false
  }

  // Calculate refund amount
  let refundAmount = 0
  if (data.returnType === "total") {
    refundAmount = Number(order.deposit) // refund what was actually paid
  } else if (data.items && data.items.length > 0) {
    refundAmount = data.items.reduce((sum, item) => sum + item.subtotal, 0)
  }

  // Insert return
  const { data: returnRecord, error } = await supabase
    .from("order_returns")
    .insert({
      order_id: data.orderId,
      tenant_id: data.tenantId,
      return_type: data.returnType,
      reason: data.reason,
      reason_details: data.reasonDetails || null,
      status: "pending",
      refund_method: data.refundMethod,
      refund_amount: refundAmount,
      created_by: user?.id || null,
      created_by_name: user?.user_metadata?.display_name || user?.email || null,
      notes: data.notes || null,
    })
    .select("id")
    .single()

  if (error || !returnRecord) {
    console.error("[v0] Error creating return:", error?.message)
    return false
  }

  // Insert return items for partial returns
  if (data.returnType === "partial" && data.items && data.items.length > 0) {
    const itemRows = data.items.map((item) => ({
      return_id: returnRecord.id,
      order_item_id: item.orderItemId || null,
      product_name: item.productName,
      quantity_returned: item.quantityReturned,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
      reason: item.reason || null,
    }))

    const { error: itemsErr } = await supabase
      .from("order_return_items")
      .insert(itemRows)

    if (itemsErr) {
      console.error("[v0] Error creating return items:", itemsErr.message)
    }
  }

  // Update order return_status
  const returnStatus = data.returnType === "total" ? "full_return" : "partial_return"
  await supabase
    .from("orders")
    .update({ return_status: returnStatus, updated_at: new Date().toISOString() })
    .eq("id", data.orderId)

  // Record in status history
  await supabase.from("order_status_history").insert({
    order_id: data.orderId,
    tenant_id: data.tenantId,
    from_status: null,
    to_status: `retour-${data.returnType}`,
    changed_by: user?.id || null,
    changed_by_name: user?.user_metadata?.display_name || user?.email || null,
    note: `Retour ${data.returnType === "total" ? "total" : "partiel"} - ${reasonLabels[data.reason]} - ${refundAmount.toLocaleString("fr-TN")} TND`,
  })

  return true
}

// ─── Process Return (approve/reject/complete) ─────────────────

export async function processReturn(
  returnId: string,
  tenantId: string,
  action: "approved" | "rejected" | "completed"
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get the return
  const { data: returnRecord } = await supabase
    .from("order_returns")
    .select("*, orders(customer_name, customer_phone, total, deposit)")
    .eq("id", returnId)
    .single()

  if (!returnRecord) return false

  // Update return status
  const { error } = await supabase
    .from("order_returns")
    .update({
      status: action,
      processed_by: user?.id || null,
      processed_by_name: user?.user_metadata?.display_name || user?.email || null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", returnId)

  if (error) {
    console.error("[v0] Error processing return:", error.message)
    return false
  }

  // If completed and refund method is credit_note, create a customer credit
  if (action === "completed" && returnRecord.refund_method === "credit_note") {
    const order = returnRecord.orders as { customer_name: string; customer_phone: string } | null

    const { data: credit } = await supabase
      .from("customer_credits")
      .insert({
        tenant_id: tenantId,
        customer_name: order?.customer_name || "Client",
        customer_phone: order?.customer_phone || null,
        original_order_id: returnRecord.order_id,
        return_id: returnId,
        amount: Number(returnRecord.refund_amount),
        notes: `Avoir genere suite au retour - ${reasonLabels[returnRecord.reason as ReturnReason]}`,
        created_by: user?.id || null,
        created_by_name: user?.user_metadata?.display_name || user?.email || null,
      })
      .select("id")
      .single()

    // Link credit to return
    if (credit) {
      await supabase
        .from("order_returns")
        .update({ credit_note_id: credit.id })
        .eq("id", returnId)
    }
  }

  // Record in status history
  const actionLabels = {
    approved: "Retour approuve",
    rejected: "Retour rejete",
    completed: "Retour finalise",
  }

  await supabase.from("order_status_history").insert({
    order_id: returnRecord.order_id,
    tenant_id: tenantId,
    from_status: null,
    to_status: `retour-${action}`,
    changed_by: user?.id || null,
    changed_by_name: user?.user_metadata?.display_name || user?.email || null,
    note: `${actionLabels[action]} - ${refundMethodLabels[returnRecord.refund_method as RefundMethod]} - ${Number(returnRecord.refund_amount).toLocaleString("fr-TN")} TND`,
  })

  return true
}

// ─── Customer Credits ─────────────────────────────────────────

export async function fetchCustomerCredits(tenantId: string): Promise<CustomerCredit[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("customer_credits")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching credits:", error.message)
    return []
  }

  return (data || []).map((c) => ({
    id: c.id,
    tenantId: c.tenant_id,
    customerName: c.customer_name,
    customerPhone: c.customer_phone,
    originalOrderId: c.original_order_id,
    returnId: c.return_id,
    amount: Number(c.amount),
    usedAmount: Number(c.used_amount),
    status: c.status,
    expiresAt: c.expires_at,
    notes: c.notes,
    createdByName: c.created_by_name,
    createdAt: c.created_at,
  }))
}

export async function useCredit(
  creditId: string,
  amountToUse: number
): Promise<boolean> {
  const supabase = await createClient()

  const { data: credit } = await supabase
    .from("customer_credits")
    .select("amount, used_amount")
    .eq("id", creditId)
    .single()

  if (!credit) return false

  const newUsed = Number(credit.used_amount) + amountToUse
  const remaining = Number(credit.amount) - newUsed
  let newStatus = "active"
  if (remaining <= 0) newStatus = "fully_used"
  else if (newUsed > 0) newStatus = "partially_used"

  const { error } = await supabase
    .from("customer_credits")
    .update({
      used_amount: newUsed,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", creditId)

  if (error) {
    console.error("[v0] Error using credit:", error.message)
    return false
  }

  return true
}
