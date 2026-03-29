import { createClient } from "@/lib/supabase/client"
import { createNotification } from "@/lib/notifications/actions"

// ─── Types ─────────────────────────────────────────────────
export interface CriticalStockItem {
  id: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  pricePerUnit: number
  supplierId: string | null
  supplierName: string | null
  ratio: number // currentStock / minStock (0 = empty, <1 = critical)
}

export type AlertSeverity = "critical" | "warning" | "info"

export interface StockAlert {
  id: string
  materialId: string
  materialName: string
  severity: AlertSeverity
  currentStock: number
  minStock: number
  unit: string
  ratio: number
  message: string
}

// ─── Fetch critical stock via RPC ──────────────────────────
// Uses the `get_critical_stock` RPC function which compares
// current_stock <= min_stock server-side (not possible via PostgREST filters)
export async function getCriticalStock(tenantId: string): Promise<CriticalStockItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc("get_critical_stock", {
    p_tenant_id: tenantId,
  })

  if (error) {
    console.error("Error fetching critical stock:", error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    currentStock: row.current_stock,
    minStock: row.min_stock,
    pricePerUnit: row.price_per_unit,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    ratio: row.min_stock > 0 ? row.current_stock / row.min_stock : 0,
  }))
}

// ─── Build structured alerts from critical items ───────────
export function buildStockAlerts(items: CriticalStockItem[]): StockAlert[] {
  return items.map((item) => {
    let severity: AlertSeverity = "warning"
    if (item.ratio === 0) severity = "critical"
    else if (item.ratio <= 0.25) severity = "critical"
    else if (item.ratio <= 0.5) severity = "warning"
    else severity = "info"

    let message: string
    if (item.currentStock === 0) {
      message = `Rupture de stock ! Aucun ${item.name} en reserve.`
    } else {
      message = `Stock actuel: ${item.currentStock}${item.unit} (seuil: ${item.minStock}${item.unit})`
    }

    return {
      id: `stock-alert-${item.id}`,
      materialId: item.id,
      materialName: item.name,
      severity,
      currentStock: item.currentStock,
      minStock: item.minStock,
      unit: item.unit,
      ratio: item.ratio,
      message,
    }
  })
}

// ─── Essentials check (farine, sucre, beurre, etc.) ────────
const ESSENTIAL_MATERIALS = ["farine", "sucre", "beurre", "oeufs", "lait", "levure", "chocolat"]

export function filterEssentialAlerts(alerts: StockAlert[]): StockAlert[] {
  return alerts.filter((alert) =>
    ESSENTIAL_MATERIALS.some((essential) =>
      alert.materialName.toLowerCase().includes(essential)
    )
  )
}

// ─── Fetch and return critical stock alerts ────────────────
export async function fetchCriticalStockAlerts(tenantId: string): Promise<StockAlert[]> {
  const items = await getCriticalStock(tenantId)
  return buildStockAlerts(items)
}

// ─── Create notification for critical stock ────────────────
// Call this after detecting new critical items to push a notification
export async function notifyCriticalStock(
  tenantId: string,
  items: CriticalStockItem[]
): Promise<void> {
  if (items.length === 0) return

  const criticalNames = items
    .filter((i) => i.ratio <= 0.25)
    .map((i) => i.name)
    .slice(0, 5)

  const title =
    items.length === 1
      ? `Stock critique : ${items[0].name}`
      : `${items.length} matieres en stock critique`

  const message =
    criticalNames.length > 0
      ? `Attention : ${criticalNames.join(", ")}${items.length > 5 ? ` et ${items.length - 5} autres` : ""}`
      : `${items.length} matiere(s) premiere(s) sous le seuil minimum`

  await createNotification(tenantId, {
    type: "info",
    title,
    message,
    priority: items.some((i) => i.ratio === 0) ? "urgent" : "high",
    targetRole: "all",
    actionUrl: "/stocks",
  })
}
