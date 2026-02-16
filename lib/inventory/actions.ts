import { createClient } from "@/lib/supabase/client"

export interface InventorySession {
  id: string
  tenantId: string
  status: string
  itemsCount: number
  discrepancies: number
  notes: string | null
  createdAt: string
  completedAt: string | null
}

export async function fetchInventorySessions(tenantId: string): Promise<InventorySession[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("inventory_sessions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false })
  if (error) { console.error("Error fetching inventory sessions:", error.message); return [] }
  return (data || []).map((s) => ({
    id: s.id, tenantId: s.tenant_id, status: s.status, itemsCount: s.items_count,
    discrepancies: s.discrepancies, notes: s.notes, createdAt: s.created_at, completedAt: s.completed_at,
  }))
}

export async function createInventorySession(tenantId: string, notes?: string): Promise<InventorySession | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: row, error } = await supabase.from("inventory_sessions").insert({
    tenant_id: tenantId, notes: notes || null, created_by: user?.id || null,
  }).select().single()
  if (error || !row) { console.error("Error creating inventory session:", error?.message); return null }
  return { id: row.id, tenantId: row.tenant_id, status: row.status, itemsCount: row.items_count,
    discrepancies: row.discrepancies, notes: row.notes, createdAt: row.created_at, completedAt: row.completed_at }
}
