import { createClient } from "@/lib/supabase/client"
import { updateOrderStatus } from "@/lib/orders/actions"

// ─── Fetch orders for packer view ──────────────────────────────
// Shows: "en-preparation" (to pack / in progress) and "pret" (packed today)

export async function fetchPackerOrders(tenantId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["nouveau", "en-preparation", "pret"])
    .order("created_at", { ascending: true }) // FIFO — oldest first

  if (error) {
    console.error("Error fetching packer orders:", error.message)
    return []
  }

  return data || []
}

// ─── Take order — emballeur starts packing ─────────────────────
// Sets packed_by field to emballeur name, transitions to en-preparation if needed

export async function startPacking(
  orderId: string,
  tenantId: string,
  emballeurName: string
): Promise<boolean> {
  const supabase = createClient()

  // Get current status to determine if we need a status transition
  const { data: current } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single()

  const fromStatus = current?.status || "nouveau"
  const toStatus = "en-preparation"

  // Mark who is packing (packed_by) and ensure status is en-preparation
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      packed_by: emballeurName,
      status: toStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)

  if (updateError) {
    console.error("Error assigning packer:", updateError.message)
    return false
  }

  // Record in status history
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    tenant_id: tenantId,
    from_status: fromStatus,
    to_status: toStatus,
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

  // Get current status for history
  const { data: current } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single()

  const currentStatus = current?.status || "en-preparation"

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    tenant_id: tenantId,
    from_status: currentStatus,
    to_status: currentStatus,
    changed_by: user?.id || null,
    changed_by_name: emballeurName,
    note: `Problème: ${issue}`,
  })

  return true
}
