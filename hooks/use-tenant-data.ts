import useSWR from "swr"
import { useTenant } from "@/lib/tenant-context"
import { fetchRawMaterials, fetchFinishedProducts, fetchCategories, fetchStockMovements, fetchPackaging, fetchConsumables, fetchStorageLocations } from "@/lib/stocks/actions"
import { fetchProspects, fetchDueReminders } from "@/lib/prospects/actions"
import { fetchTransactions } from "@/lib/treasury/actions"
import { fetchSuppliers, fetchPurchaseOrders, fetchSupplierPriceHistory, fetchPurchaseInvoices, fetchDeliveryNotes } from "@/lib/approvisionnement/actions"
import { fetchRecipes, fetchProductionRuns } from "@/lib/production/actions"
import { fetchInventorySessions } from "@/lib/inventory/actions"
import { fetchOrders } from "@/lib/orders/actions"
import { fetchNotifications } from "@/lib/notifications/actions"
import { getCriticalStock } from "@/lib/stocks/notifications"
import { fetchProductionPlans } from "@/lib/planning/actions"
import { fetchSalesChannels } from "@/lib/channels/actions"
import { fetchClients, fetchAllOrders as fetchClientOrders, fetchAgentStats } from "@/lib/clients/actions"
import { fetchDeliveryShipments } from "@/lib/delivery/actions"

function useTenantQuery<T>(key: string, fetcher: (tenantId: string) => Promise<T>) {
  const { currentTenant, isLoading: tenantLoading } = useTenant()
  const tenantId = currentTenant.id
  const isFallback = tenantId === "__fallback__"

  return useSWR(
    !tenantLoading && !isFallback ? `${key}-${tenantId}` : null,
    () => fetcher(tenantId),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )
}

export function useRawMaterials() {
  return useTenantQuery("raw-materials", fetchRawMaterials)
}

export function useFinishedProducts() {
  return useTenantQuery("finished-products", fetchFinishedProducts)
}

export function useCategories() {
  return useTenantQuery("categories", fetchCategories)
}

export function usePackaging() {
  return useTenantQuery("packaging", fetchPackaging)
}

export function useConsumables() {
  return useTenantQuery("consumables", fetchConsumables)
}

export function useStorageLocations() {
  return useTenantQuery("storage-locations", fetchStorageLocations)
}

export function useStockMovements(limit = 50) {
  const { currentTenant, isLoading: tenantLoading } = useTenant()
  const tenantId = currentTenant.id
  const isFallback = tenantId === "__fallback__"
  return useSWR(
    !tenantLoading && !isFallback ? `stock-movements-${tenantId}` : null,
    () => fetchStockMovements(tenantId, limit),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )
}

export function useTransactions() {
  return useTenantQuery("transactions", fetchTransactions)
}

export function useSuppliers() {
  return useTenantQuery("suppliers", fetchSuppliers)
}

export function usePurchaseOrders() {
  return useTenantQuery("purchase-orders", fetchPurchaseOrders)
}

export function useRecipes() {
  return useTenantQuery("recipes", fetchRecipes)
}

export function useProductionRuns() {
  return useTenantQuery("production-runs", fetchProductionRuns)
}

export function useInventorySessions() {
  return useTenantQuery("inventory-sessions", fetchInventorySessions)
}

export function useOrders() {
  return useTenantQuery("orders", fetchOrders)
}

export function useProspects() {
  return useTenantQuery("prospects", fetchProspects)
}

export function useNotifications(role?: string) {
  const { currentTenant, currentRole, isLoading: tenantLoading } = useTenant()
  const tenantId = currentTenant.id
  const isFallback = tenantId === "__fallback__"
  const targetRole = role || currentRole
  return useSWR(
    !tenantLoading && !isFallback ? `notifications-${tenantId}-${targetRole}` : null,
    () => fetchNotifications(tenantId, targetRole),
    { revalidateOnFocus: true, refreshInterval: 30000, dedupingInterval: 5000 }
  )
}

export function useProductionPlans() {
  return useTenantQuery("production-plans", fetchProductionPlans)
}

export function useSupplierPrices() {
  return useTenantQuery("supplier-prices", fetchSupplierPriceHistory)
}

export function usePurchaseInvoices() {
  return useTenantQuery("purchase-invoices", fetchPurchaseInvoices)
}

export function useDeliveryNotes() {
  return useTenantQuery("delivery-notes", fetchDeliveryNotes)
}

export function useCriticalStock() {
  return useTenantQuery("critical-stock", getCriticalStock)
}

export function useSalesChannels() {
  return useTenantQuery("sales-channels", fetchSalesChannels)
}

export function useClients() {
  return useTenantQuery("clients", fetchClients)
}

export function useClientOrders() {
  return useTenantQuery("client-orders", fetchClientOrders)
}

export function useAgentStats() {
  return useTenantQuery("agent-stats", fetchAgentStats)
}

export function useDueReminders() {
  const { currentTenant, isLoading: tenantLoading } = useTenant()
  const tenantId = currentTenant.id
  const isFallback = tenantId === "__fallback__"
  return useSWR(
    !tenantLoading && !isFallback ? `due-reminders-${tenantId}` : null,
    () => fetchDueReminders(tenantId),
    { revalidateOnFocus: true, refreshInterval: 60000, dedupingInterval: 10000 }
  )
}

export function useDeliveryShipments() {
  return useTenantQuery("delivery-shipments", fetchDeliveryShipments)
}
