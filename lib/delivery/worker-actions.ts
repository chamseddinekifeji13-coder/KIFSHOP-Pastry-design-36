import { createClient } from "@/lib/supabase/client"
import { updateOrderStatus } from "@/lib/orders/actions"

// ─── Fetch delivery orders for the livreur view ──────────────

export async function fetchDeliveryOrders(tenantId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_name, customer_phone, customer_address, total, status, courier, created_at, delivery_type, items, notes, delivered_at")
    .eq("tenant_id", tenantId)
    .eq("delivery_type", "delivery")
    .in("status", ["pret", "en-livraison", "livre"])
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching delivery orders:", error.message)
    return []
  }

  return data || []
}

// ─── Take delivery — assign to livreur ───────────────────────

export async function takeDelivery(
  orderId: string,
  tenantId: string,
  livreurName: string
): Promise<boolean> {
  const supabase = createClient()

  // Set courier field to livreur name
  const { error: courierError } = await supabase
    .from("orders")
    .update({ courier: livreurName })
    .eq("id", orderId)

  if (courierError) {
    console.error("Error assigning courier:", courierError.message)
    return false
  }

  // Update status via existing function (handles status_history)
  return updateOrderStatus(
    orderId,
    tenantId,
    "en-livraison",
    `Prise en charge par ${livreurName}`
  )
}

// ─── Mark as delivered ───────────────────────────────────────

export async function markDelivered(
  orderId: string,
  tenantId: string,
  livreurName: string
): Promise<boolean> {
  return updateOrderStatus(
    orderId,
    tenantId,
    "livre",
    `Livre par ${livreurName}`
  )
}

// ─── Mark as failed (add note, keep en-livraison) ────────────

export async function markFailed(
  orderId: string,
  tenantId: string,
  livreurName: string,
  reason: string
): Promise<boolean> {
  const supabase = createClient()

  // Append failure note to order
  const { data: order } = await supabase
    .from("orders")
    .select("notes")
    .eq("id", orderId)
    .single()

  const existingNotes = order?.notes || ""
  const timestamp = new Date().toLocaleString("fr-FR")
  const failureNote = `[${timestamp}] Echec livraison (${livreurName}): ${reason}`
  const updatedNotes = existingNotes ? `${existingNotes}\n${failureNote}` : failureNote

  const { error } = await supabase
    .from("orders")
    .update({ notes: updatedNotes })
    .eq("id", orderId)

  if (error) {
    console.error("Error updating notes:", error.message)
    return false
  }

  // Record in status history (status stays en-livraison)
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    tenant_id: tenantId,
    from_status: "en-livraison",
    to_status: "en-livraison",
    changed_by: user?.id || null,
    changed_by_name: livreurName,
    note: `Echec: ${reason}`,
  })

  return true
}
