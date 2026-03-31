import { createClient } from "@/lib/supabase/client"
import { updateOrderStatus } from "@/lib/orders/actions"

// ─── Fetch orders for packer view ──────────────────────────────
// Shows: "en-preparation" (to pack / in progress) and "pret" (packed today)

export async function fetchPackerOrders(tenantId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("tenant_id", tenantId)
    .in("status", ["en-preparation", "pret"])
    .order("created_at", { ascending: true }) // FIFO — oldest first

  if (error) {
    console.error("Error fetching packer orders:", error.message)
    return []
  }

  return data || []
}

// ─── Take order — emballeur starts packing ─────────────────────
// Sets courier field to emballeur name, records in status history

export async function startPacking(
  orderId: string,
  tenantId: string,
  emballeurName: string
): Promise<boolean> {
  const supabase = createClient()

  // Mark who is packing (use courier field)
  const { error: courierError } = await supabase
    .from("orders")
    .update({ courier: emballeurName })
    .eq("id", orderId)

  if (courierError) {
    console.error("Error assigning packer:", courierError.message)
    return false
  }

  // Record in status history (status stays en-preparation, but we log the assignment)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    tenant_id: tenantId,
    from_status: "en-preparation",
    to_status: "en-preparation",
    changed_by: user?.id || null,
    changed_by_name: emballeurName,
    note: `Prise en charge par ${emballeurName}`,
  })

  return true
}

// ─── Complete packing — move to "pret" ─────────────────────────

export async function completePacking(
  orderId: string,
  tenantId: string,
  emballeurName: string
): Promise<boolean> {
  return updateOrderStatus(
    orderId,
    tenantId,
    "pret",
    `Emballé par ${emballeurName}`
  )
}

// ─── Report problem with order ─────────────────────────────────

export async function reportPackingIssue(
  orderId: string,
  tenantId: string,
  emballeurName: string,
  issue: string
): Promise<boolean> {
  const supabase = createClient()

  // Append issue to notes
  const { data: order } = await supabase
    .from("orders")
    .select("notes")
    .eq("id", orderId)
    .single()

  const timestamp = new Date().toLocaleString("fr-FR")
  const issueNote = `[${timestamp}] Problème emballage (${emballeurName}): ${issue}`
  const notes = order?.notes ? `${order.notes}\n${issueNote}` : issueNote

  const { error } = await supabase
    .from("orders")
    .update({ notes })
    .eq("id", orderId)

  if (error) {
    console.error("Error updating notes:", error.message)
    return false
  }

  // Record in status history
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    tenant_id: tenantId,
    from_status: "en-preparation",
    to_status: "en-preparation",
    changed_by: user?.id || null,
    changed_by_name: emballeurName,
    note: `Problème: ${issue}`,
  })

  return true
}
