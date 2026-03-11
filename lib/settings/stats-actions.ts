"use server"

import { createClient } from "@/lib/supabase/server"

// ─── Get Stats Reset Date ─────────────────────────────────────
export async function getStatsResetDate(tenantId: string): Promise<Date | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("tenant_settings")
    .select("stats_reset_date")
    .eq("tenant_id", tenantId)
    .single()
  
  if (error || !data?.stats_reset_date) {
    return null
  }
  
  return new Date(data.stats_reset_date)
}

// ─── Reset Seller Performance Stats ───────────────────────────
// Sets the reset date to NOW, so all stats before this date are ignored
export async function resetSellerStats(tenantId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  const now = new Date().toISOString()
  
  // Upsert: create if not exists, update if exists
  const { error } = await supabase
    .from("tenant_settings")
    .upsert(
      {
        tenant_id: tenantId,
        stats_reset_date: now,
        updated_at: now,
      },
      { onConflict: "tenant_id" }
    )
  
  if (error) {
    console.error("Error resetting stats:", error.message)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// ─── Clear Stats Reset (go back to full history) ──────────────
export async function clearStatsReset(tenantId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from("tenant_settings")
    .update({
      stats_reset_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
  
  if (error) {
    console.error("Error clearing stats reset:", error.message)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}
