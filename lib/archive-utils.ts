import { createAdminClient } from "@/lib/supabase/server"

/**
 * Fonction utilitaire pour archiver les commandes
 * Utilisée par l'API cron et l'API manual
 */
export async function archiveOrders(olderThanDays: number) {
  try {
    const safeDays = Number.isFinite(olderThanDays) ? Math.max(1, Math.floor(olderThanDays)) : 14
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString()

    const supabase = createAdminClient()

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id")

    if (tenantsError) {
      throw new Error(`Erreur lecture tenants: ${tenantsError.message}`)
    }

    let archivedTotal = 0
    const details: Array<{ tenantId: string; archived: number }> = []

    for (const t of tenants || []) {
      const tenantId = String((t as { id: string }).id || "")
      if (!tenantId) continue

      // Archive only completed & paid orders
      // Status must be 'livre' (delivered/sold) AND payment must be collected/paid
      const { data: rows, error: listError } = await supabase
        .from("orders")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "livre")
        .in("payment_status", ["paid", "collected"])
        .lte("updated_at", cutoff)
        .or("is_archived.is.null,is_archived.eq.false")

      if (listError) {
        details.push({ tenantId, archived: 0 })
        continue
      }

      const ids = (rows || []).map((r: any) => r.id).filter(Boolean)
      if (ids.length === 0) {
        details.push({ tenantId, archived: 0 })
        continue
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .in("id", ids)

      if (updateError) {
        details.push({ tenantId, archived: 0 })
        continue
      }

      archivedTotal += ids.length
      details.push({ tenantId, archived: ids.length })
    }

    return {
      success: true,
      olderThanDays: safeDays,
      archived: archivedTotal,
      details,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    throw error
  }
}