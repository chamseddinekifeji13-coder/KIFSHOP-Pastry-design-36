"use client"

import { useState, useCallback } from "react"
import { useSWRConfig } from "swr"
import { KPICards } from "./kpi-cards"
import { RevenueChart } from "./revenue-chart"
import { AlertsPanel } from "./alerts-panel"
import { OnlineSalesWidget } from "./online-sales-widget"
import { BestDeliveryReport } from "./best-delivery-report"
import { useI18n } from "@/lib/i18n/context"
import { useTenant } from "@/lib/tenant-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Truck, RefreshCw } from "lucide-react"

export function DashboardView() {
  const { t } = useI18n()
  const { currentTenant, currentRole } = useTenant()
  const { mutate } = useSWRConfig()
  const [activeTab, setActiveTab] = useState("overview")
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Only owner and gerant can access Best Delivery
  const canAccessDelivery = currentRole === "owner" || currentRole === "gerant"
  
  // Rafraichir toutes les donnees du dashboard
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    const tenantId = currentTenant.id
    
    // Invalider les caches critiques du dashboard avec revalidation forcee
    const keysToRefresh = [
      `transactions-${tenantId}`,
      `orders-${tenantId}`,
      `raw-materials-${tenantId}`,
      `notifications-${tenantId}`,
      `critical-stock-${tenantId}`,
    ]
    
    // Revalider chaque cle specifiquement pour une mise a jour immediate
    await Promise.all(keysToRefresh.map(key => mutate(key)))
    
    // Aussi invalider tous les autres caches lies au tenant
    await mutate(
      (key) => typeof key === "string" && key.includes(tenantId),
      undefined,
      { revalidate: true }
    )
    
    // Petit delai pour montrer le feedback visuel
    setTimeout(() => setIsRefreshing(false), 600)
  }, [currentTenant.id, mutate])

  // Contenu réutilisable extrait pour éviter la duplication
  const OverviewContent = () => (
    <>
      <KPICards />
      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueChart />
        <div className="space-y-6">
          <AlertsPanel />
          <OnlineSalesWidget />
        </div>
      </div>
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Actualisation..." : "Actualiser"}
        </Button>
      </div>

      {canAccessDelivery ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.overviewTab") || "Vue générale"}
            </TabsTrigger>
            <TabsTrigger value="best-delivery" className="flex items-center gap-2">
              <Truck className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.bestDeliveryTab") || "Best Delivery"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewContent />
          </TabsContent>

          <TabsContent value="best-delivery">
            <BestDeliveryReport />
          </TabsContent>
        </Tabs>
      ) : (
        <OverviewContent />
      )}
    </div>
  )
}
