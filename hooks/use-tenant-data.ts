import useSWR from "swr"
import { useTenant } from "@/lib/tenant-context"
import { fetchRawMaterials, fetchFinishedProducts, fetchCategories, fetchStockMovements, fetchPackaging } from "@/lib/stocks/actions"
import { fetchTransactions } from "@/lib/treasury/actions"
import { fetchSuppliers, fetchPurchaseOrders } from "@/lib/approvisionnement/actions"
import { fetchRecipes, fetchProductionRuns } from "@/lib/production/actions"
import { fetchInventorySessions } from "@/lib/inventory/actions"
import { fetchOrders } from "@/lib/orders/actions"

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
